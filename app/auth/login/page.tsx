import Link from "next/link";
import { Suspense } from "react";
import { StudelioLogo } from "@/components/studelio-logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main
      id="contenu-principal"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center bg-[var(--studelio-bg-soft)] px-4 py-12 outline-none"
    >
      <div className="mb-8 flex flex-col items-center text-center">
        <h1 className="sr-only">Studelio — Connexion</h1>
        <StudelioLogo size="lg" className="mx-auto" priority />
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
    </main>
  );
}
