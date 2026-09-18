-- Aria AI core schema
-- Tenancy model: each authenticated agent owns rows via users.id = auth.uid().
-- Service role (webhooks / Edge Functions) bypasses RLS.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector" with schema extensions;
create extension if not exists "pg_net" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role, authenticated;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

set search_path = public, extensions, private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function private.current_agent_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

grant execute on function private.current_agent_id() to authenticated;

-- ---------------------------------------------------------------------------
-- users (agent profiles — 1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  phone text,
  brokerage text,
  license_number text,
  timezone text not null default 'America/New_York',
  twilio_from_number text,
  docusign_account_id text,
  default_market text,
  avatar_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger users_set_updated_at
before update on public.users
for each row execute function private.set_updated_at();

alter table public.users enable row level security;
alter table public.users force row level security;

create policy users_select_own
  on public.users for select to authenticated
  using (id = private.current_agent_id());

create policy users_update_own
  on public.users for update to authenticated
  using (id = private.current_agent_id())
  with check (id = private.current_agent_id());

create policy users_insert_own
  on public.users for insert to authenticated
  with check (id = private.current_agent_id());

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- properties (MLS cache + agent-owned listings)
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  listing_key text unique,
  reso_source text,
  address_line text not null,
  unit text,
  city text not null,
  state text not null,
  postal_code text not null,
  county text,
  latitude double precision,
  longitude double precision,
  list_price numeric(12, 2),
  original_list_price numeric(12, 2),
  beds numeric(4, 1),
  baths numeric(4, 1),
  living_area_sqft integer,
  lot_size_sqft integer,
  year_built integer,
  property_type text,
  status text not null default 'active',
  school_district text,
  photo_url text,
  media jsonb not null default '[]'::jsonb,
  schools jsonb not null default '[]'::jsonb,
  raw_mls jsonb,
  embedding extensions.vector(1536),
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index properties_city_state_idx on public.properties (city, state);
create index properties_list_price_idx on public.properties (list_price);
create index properties_status_idx on public.properties (status);
create index properties_embedding_idx
  on public.properties using hnsw (embedding vector_cosine_ops);

create trigger properties_set_updated_at
before update on public.properties
for each row execute function private.set_updated_at();

alter table public.properties enable row level security;
alter table public.properties force row level security;

create policy properties_read_authenticated
  on public.properties for select to authenticated
  using (true);

-- Writes go through service role / MLS sync, not the agent client.

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.users (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  source text not null check (
    source in ('meta_ads', 'zillow', 'realtor', 'manual', 'referral', 'website')
  ),
  status text not null default 'new' check (
    status in (
      'new',
      'qualifying',
      'qualified',
      'nurture',
      'appointment_set',
      'under_contract',
      'closed',
      'lost',
      'disqualified'
    )
  ),
  provider_event_id text,
  listing_id text,
  first_name text,
  last_name text,
  full_name text not null,
  email text,
  phone text,
  message text,
  budget_min numeric(12, 2),
  budget_max numeric(12, 2),
  preferred_location text,
  timeline text,
  qualification_sent_at timestamptz,
  qualified_at timestamptz,
  last_contacted_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (agent_id, provider_event_id)
);

create index leads_agent_status_idx on public.leads (agent_id, status, created_at desc);
create index leads_phone_idx on public.leads (agent_id, phone);
create index leads_email_idx on public.leads (agent_id, email);
create index leads_full_name_trgm_idx on public.leads using gin (full_name gin_trgm_ops);

create trigger leads_set_updated_at
before update on public.leads
for each row execute function private.set_updated_at();

alter table public.leads enable row level security;
alter table public.leads force row level security;

create policy leads_select_own
  on public.leads for select to authenticated
  using (agent_id = private.current_agent_id());

create policy leads_insert_own
  on public.leads for insert to authenticated
  with check (agent_id = private.current_agent_id());

create policy leads_update_own
  on public.leads for update to authenticated
  using (agent_id = private.current_agent_id())
  with check (agent_id = private.current_agent_id());

-- ---------------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.users (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  channel text not null check (
    channel in ('sms', 'voice', 'email', 'whatsapp', 'in_app')
  ),
  provider_thread_id text,
  status text not null default 'open',
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index conversations_lead_idx on public.conversations (lead_id, created_at desc);
create index conversations_agent_idx on public.conversations (agent_id, last_message_at desc);

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function private.set_updated_at();

alter table public.conversations enable row level security;
alter table public.conversations force row level security;

create policy conversations_select_own
  on public.conversations for select to authenticated
  using (agent_id = private.current_agent_id());

create policy conversations_insert_own
  on public.conversations for insert to authenticated
  with check (agent_id = private.current_agent_id());

create policy conversations_update_own
  on public.conversations for update to authenticated
  using (agent_id = private.current_agent_id())
  with check (agent_id = private.current_agent_id());

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  agent_id uuid not null references public.users (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound', 'system')),
  body text,
  media_url text,
  provider_message_id text,
  ai_generated boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index conversation_messages_thread_idx
  on public.conversation_messages (conversation_id, created_at);

alter table public.conversation_messages enable row level security;
alter table public.conversation_messages force row level security;

create policy conversation_messages_select_own
  on public.conversation_messages for select to authenticated
  using (agent_id = private.current_agent_id());

create policy conversation_messages_insert_own
  on public.conversation_messages for insert to authenticated
  with check (agent_id = private.current_agent_id());

-- ---------------------------------------------------------------------------
-- calendar events
-- ---------------------------------------------------------------------------

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.users (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  provider text not null default 'internal',
  provider_event_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index calendar_events_agent_starts_idx
  on public.calendar_events (agent_id, starts_at);

create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function private.set_updated_at();

alter table public.calendar_events enable row level security;
alter table public.calendar_events force row level security;

create policy calendar_events_all_own
  on public.calendar_events for all to authenticated
  using (agent_id = private.current_agent_id())
  with check (agent_id = private.current_agent_id());

-- ---------------------------------------------------------------------------
-- contracts (DocuSign + HITL approval queue)
-- ---------------------------------------------------------------------------

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.users (id) on delete cascade,
  buyer_id uuid not null references public.leads (id) on delete restrict,
  property_id uuid not null references public.properties (id) on delete restrict,
  status text not null default 'draft' check (
    status in ('draft', 'pending_approval', 'approved', 'sent', 'signed', 'voided', 'error')
  ),
  template_id text,
  envelope_id text,
  offer_price numeric(12, 2),
  closing_date date,
  field_map jsonb not null default '{}'::jsonb,
  summary text,
  approval_note text,
  approved_at timestamptz,
  sent_at timestamptz,
  signed_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index contracts_agent_status_idx on public.contracts (agent_id, status, created_at desc);
create index contracts_buyer_idx on public.contracts (buyer_id);

create trigger contracts_set_updated_at
before update on public.contracts
for each row execute function private.set_updated_at();

alter table public.contracts enable row level security;
alter table public.contracts force row level security;

create policy contracts_select_own
  on public.contracts for select to authenticated
  using (agent_id = private.current_agent_id());

create policy contracts_insert_own
  on public.contracts for insert to authenticated
  with check (agent_id = private.current_agent_id());

create policy contracts_update_own
  on public.contracts for update to authenticated
  using (agent_id = private.current_agent_id())
  with check (agent_id = private.current_agent_id());

-- ---------------------------------------------------------------------------
-- client_memories (pgvector long-term memory)
-- ---------------------------------------------------------------------------

create table public.client_memories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.users (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  kind text not null check (
    kind in (
      'preference',
      'budget',
      'timeline',
      'location',
      'property_feedback',
      'call_summary',
      'family',
      'financing',
      'objection'
    )
  ),
  content text not null,
  importance real not null default 0.5 check (importance >= 0 and importance <= 1),
  source_conversation_id uuid references public.conversations (id) on delete set null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default timezone('utc', now())
);

create index client_memories_lead_idx on public.client_memories (lead_id, created_at desc);
create index client_memories_agent_idx on public.client_memories (agent_id, kind);
create index client_memories_embedding_idx
  on public.client_memories using hnsw (embedding vector_cosine_ops);

alter table public.client_memories enable row level security;
alter table public.client_memories force row level security;

create policy client_memories_select_own
  on public.client_memories for select to authenticated
  using (agent_id = private.current_agent_id());

create policy client_memories_insert_own
  on public.client_memories for insert to authenticated
  with check (agent_id = private.current_agent_id());

-- Vector search is invoker-scoped so RLS on client_memories still applies.
create or replace function public.match_client_memories (
  query_embedding extensions.vector(1536),
  match_lead_id uuid,
  match_count int default 8,
  match_threshold float default 0.7
)
returns table (
  id uuid,
  lead_id uuid,
  kind text,
  content text,
  importance real,
  similarity float
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    client_memories.id,
    client_memories.lead_id,
    client_memories.kind,
    client_memories.content,
    client_memories.importance,
    1 - (client_memories.embedding <=> query_embedding) as similarity
  from public.client_memories
  where client_memories.lead_id = match_lead_id
    and client_memories.embedding is not null
    and 1 - (client_memories.embedding <=> query_embedding) > match_threshold
  order by client_memories.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_properties (
  query_embedding extensions.vector(1536),
  match_count int default 8,
  match_threshold float default 0.72
)
returns table (
  id uuid,
  listing_key text,
  address_line text,
  city text,
  state text,
  list_price numeric,
  similarity float
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    properties.id,
    properties.listing_key,
    properties.address_line,
    properties.city,
    properties.state,
    properties.list_price,
    1 - (properties.embedding <=> query_embedding) as similarity
  from public.properties
  where properties.embedding is not null
    and 1 - (properties.embedding <=> query_embedding) > match_threshold
  order by properties.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- webhook idempotency + qualification jobs
-- ---------------------------------------------------------------------------

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, event_id)
);

alter table public.webhook_events enable row level security;
alter table public.webhook_events force row level security;

create table public.qualification_jobs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  agent_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'queued' check (
    status in ('queued', 'running', 'sent', 'failed')
  ),
  attempt_count integer not null default 0,
  last_error text,
  run_after timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index qualification_jobs_due_idx
  on public.qualification_jobs (status, run_after)
  where status in ('queued', 'failed');

alter table public.qualification_jobs enable row level security;
alter table public.qualification_jobs force row level security;

create policy qualification_jobs_select_own
  on public.qualification_jobs for select to authenticated
  using (agent_id = private.current_agent_id());

create or replace function private.enqueue_lead_qualification()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.qualification_jobs (lead_id, agent_id)
  values (new.id, new.agent_id);

  update public.leads
  set status = 'qualifying'
  where id = new.id
    and status = 'new';

  return new;
end;
$$;

create trigger leads_enqueue_qualification
after insert on public.leads
for each row execute function private.enqueue_lead_qualification();

-- Optional: Database Webhook / pg_net call to Edge Function qualify-lead.
-- Configure URL + service role in Dashboard → Database → Webhooks on public.leads INSERT.

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.webhook_events from authenticated, anon;
grant all on public.webhook_events to service_role;
grant execute on function public.match_client_memories(extensions.vector, uuid, int, float) to authenticated, service_role;
grant execute on function public.match_properties(extensions.vector, int, float) to authenticated, service_role;
