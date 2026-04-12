import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--studelio-bg-soft)] px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold italic text-[var(--studelio-text)]">Studelio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Avec André, ton prof de français IA</p>
      </div>
      <div className="w-full max-w-md">
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="font-medium text-[var(--studelio-blue)] hover:underline">
            Connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
