# Aria AI

Operating system for a **solo real estate agent**. The product is not a CRM. It is a desk that:

1. Ingests a lead from Meta, Zillow, or Realtor.com
2. Texts them a specific qualifying question in under 20 seconds
3. Remembers budget, timing, and location from calls
4. Drafts a contract and waits for one-tap approval

## Architecture

```
apps/web            Next.js 15 App Router desk + webhook/AI APIs
apps/mobile         Expo Router (tabs: Desk, Leads, Contracts)
packages/shared     Zod schemas and domain types
supabase/           Postgres + RLS + pgvector + Edge Functions
```

Core loop:

`POST /api/webhooks/leads` → `public.leads` insert → trigger queues `qualification_jobs` → Next.js `after()` and/or Edge Function `qualify-lead` → Claude drafts SMS → Twilio sends → agent sees the thread on the desk.

Call memory:

`POST /api/webhooks/transcripts` → Claude extracts facts → OpenAI embeddings → `client_memories` (pgvector) linked to the lead.

Contracts:

`POST /api/contracts/generate` → RESO MLS refresh + DocuSign template draft → `contracts.status = pending_approval` → `POST /api/contracts/:id/approve` sends the envelope.

## Local development

```bash
pnpm install
cp .env.example apps/web/.env.local
# fill the keys you actually have; the desk UI will still boot without them

npx supabase start
npx supabase db reset
pnpm --filter @aria/web dev
pnpm --filter @aria/mobile start
```

Webhook smoke test (after DEFAULT_AGENT_ID is a real `public.users.id`):

```bash
curl -X POST http://localhost:3000/api/webhooks/leads \
  -H "Authorization: Bearer $LEAD_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"source":"zillow","firstName":"Maya","phone":"+15555550123","preferredLocation":"Brooklyn","agentId":"YOUR_AGENT_UUID"}'
```

## Production wiring

1. Deploy `apps/web` to Vercel.
2. Push the database: `npx supabase db push` (linked project).
3. Deploy functions: `npx supabase functions deploy qualify-lead ingest-transcript generate-contract`
4. In Supabase → Database → Webhooks, fire `qualify-lead` on `public.leads` INSERT.
5. Point Meta / Zillow / Realtor / Twilio callback URLs at the Vercel domain.

Claude does not expose embeddings. Vector memory uses OpenAI `text-embedding-3-small` (1536 dimensions) so it can be swapped later without a schema change to a Voyage model of the same size.

Copy `.env.example` and fill every value listed in the Manual Setup & Credential Checklist before going live.
