import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--studelio-bg-soft)] px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold italic text-[var(--studelio-text)]">Studelio</h1>
      </div>
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/auth/forgot-password" className="hover:underline">
            Mot de passe oublié
          </Link>
          {" · "}
          <Link href="/auth/register" className="font-medium text-[var(--studelio-blue)] hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
