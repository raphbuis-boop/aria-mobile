import { AppShell } from "@/components/app-shell";
import { loadDeskData } from "@/lib/data/desk";
import { ApproveButton } from "./approve-button";

export default async function ContractsPage() {
  const desk = await loadDeskData();

  return (
    <AppShell kicker="Human in the loop" title="Nothing signs itself.">
      <p className="max-w-2xl text-ink-soft">
        Aria fills the DocuSign template from MLS + buyer memory. You approve
        once. That is the entire legal gate.
      </p>
      <div className="mt-8 grid gap-4">
        {desk.contracts.length === 0 ? (
          <div className="border border-dashed border-line px-5 py-8 text-sm text-ink-soft">
            Generate a draft with POST /api/contracts/generate using a property ID
            and buyer ID. The card will appear here.
          </div>
        ) : (
          desk.contracts.map((contract) => (
            <article
              key={contract.id}
              className="grid gap-4 border border-line p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                  {contract.status}
                </p>
                <p className="mt-2 max-w-2xl leading-relaxed">{contract.summary}</p>
                <p className="mt-3 font-mono text-sm">
                  {contract.offer_price
                    ? `$${Number(contract.offer_price).toLocaleString()}`
                    : "Price unmapped"}
                </p>
              </div>
              <ApproveButton contractId={contract.id} />
            </article>
          ))
        )}
      </div>
    </AppShell>
  );
}
