"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function approve() {
    setState("loading");
    const response = await fetch(`/api/contracts/${contractId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "Approved from desk" }),
    });
    if (!response.ok) {
      setState("error");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={approve}
      disabled={state === "loading"}
      className="bg-accent px-4 py-2 text-sm text-accent-ink disabled:opacity-60"
    >
      {state === "loading"
        ? "Sending…"
        : state === "error"
          ? "Retry approval"
          : "Approve and send"}
    </button>
  );
}
