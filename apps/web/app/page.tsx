import { AppShell } from "@/components/app-shell";
import { loadDeskData } from "@/lib/data/desk";

export default async function DeskPage() {
  const desk = await loadDeskData();
  const pending = desk.leads.filter((lead) =>
    ["new", "qualifying"].includes(lead.status),
  );
  const awaiting = desk.contracts.length;

  return (
    <AppShell kicker="Today" title="The desk is the work.">
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Leads in flight" value={String(pending.length)} />
        <Stat label="Approvals waiting" value={String(awaiting)} />
        <Stat
          label="Signed in"
          value={desk.authed ? "Agent session" : "Local scaffold"}
        />
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <h2 className="text-2xl">Inbound, last forty</h2>
          <div className="mt-4 divide-y divide-line border border-line">
            {desk.leads.length === 0 ? (
              <EmptyRow text="No leads yet. Point Meta, Zillow, or Realtor.com at /api/webhooks/leads." />
            ) : (
              desk.leads.map((lead) => (
                <div
                  key={lead.id}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-medium">{lead.full_name}</p>
                    <p className="text-sm text-ink-soft">
                      {lead.source} · {lead.preferred_location ?? "no market yet"}
                    </p>
                  </div>
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
                    {lead.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <h2 className="text-2xl">One-touch queue</h2>
          <div className="mt-4 space-y-3">
            {desk.contracts.length === 0 ? (
              <div className="border border-line px-4 py-5 text-sm text-ink-soft">
                Contract drafts land here after Aria maps MLS + buyer fields into
                DocuSign. Nothing ships until you approve.
              </div>
            ) : (
              desk.contracts.map((contract) => (
                <article key={contract.id} className="border border-line p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                    Pending approval
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{contract.summary}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-4 py-6 text-sm text-ink-soft">{text}</p>;
}
