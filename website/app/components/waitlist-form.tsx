"use client";

import { useActionState } from "react";
import { joinWaitlist } from "@/app/actions/waitlist";

export function WaitlistForm() {
  const [state, formAction, isPending] = useActionState(joinWaitlist, null);

  if (state?.success) {
    return (
      <p className="text-sm text-fd-primary">{state.message}</p>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form action={formAction} className="flex gap-3">
        <input
          type="email"
          name="email"
          placeholder="you@example.com"
          required
          className="flex-1 rounded-lg border border-fd-border bg-fd-card px-4 py-2.5 text-sm text-fd-foreground placeholder:text-fd-muted-foreground focus:border-fd-primary focus:outline-none focus:ring-1 focus:ring-fd-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground shadow-lg shadow-blue-500/20 transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Joining..." : "Join Waitlist"}
        </button>
      </form>
      {state?.message && !state.success && (
        <p className="mt-2 text-sm text-red-400">{state.message}</p>
      )}
    </div>
  );
}
