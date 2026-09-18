"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Aria desk</p>
      <h1 className="mt-3 font-display text-4xl">Sign in to the book.</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full border border-line bg-paper px-3 py-2"
          />
        </label>
        <button type="submit" className="bg-accent px-4 py-2 text-sm text-accent-ink">
          Email a login link
        </button>
      </form>
      {state === "sent" ? (
        <p className="mt-4 text-sm text-ok">Check your inbox. The link expires quickly.</p>
      ) : null}
      {state === "error" ? (
        <p className="mt-4 text-sm text-danger">Could not send the link. Check Supabase Auth.</p>
      ) : null}
    </main>
  );
}
