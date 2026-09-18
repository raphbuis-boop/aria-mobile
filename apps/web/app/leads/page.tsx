import { AppShell } from "@/components/app-shell";
import { loadDeskData } from "@/lib/data/desk";

export default async function LeadsPage() {
  const desk = await loadDeskData();

  return (
    <AppShell kicker="Pipeline" title="Leads, not a CRM graveyard.">
      <p className="max-w-2xl text-ink-soft">
        Inbound webhooks write here. Aria texts within twenty seconds. You only
        step in when a human decision actually changes the file.
      </p>
      <div className="mt-8 overflow-x-auto border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper-2 text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">First text</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {desk.leads.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-ink-soft" colSpan={5}>
                  Waiting on the first webhook. Use DEFAULT_AGENT_ID so unattended
                  portals can route to you.
                </td>
              </tr>
            ) : (
              desk.leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-3">{lead.full_name}</td>
                  <td className="px-4 py-3 text-ink-soft">{lead.source}</td>
                  <td className="px-4 py-3 font-mono text-xs uppercase">
                    {lead.status}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{lead.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {lead.qualification_sent_at ? "sent" : "queued"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
