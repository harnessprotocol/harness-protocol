"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { login } from "./actions";

function LoginForm() {
  const [error, formAction, isPending] = useActionState(login, null);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/docs";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />
      <input
        type="password"
        name="password"
        placeholder="Password"
        required
        autoFocus
        className="w-full rounded-lg border border-fd-border bg-fd-card px-4 py-2.5 text-sm text-fd-foreground placeholder:text-fd-muted-foreground focus:border-fd-primary focus:outline-none focus:ring-1 focus:ring-fd-primary"
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-fd-primary px-4 py-2.5 text-sm font-medium text-fd-primary-foreground shadow-lg shadow-blue-500/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Checking..." : "Continue"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display mb-2 text-2xl font-bold text-fd-foreground">
          Preview Access
        </h1>
        <p className="mb-6 text-sm text-fd-muted-foreground">
          Enter the password to view the documentation.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
