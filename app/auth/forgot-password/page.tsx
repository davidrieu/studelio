import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--studelio-bg-soft)] px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="border-[var(--studelio-border)] shadow-[var(--studelio-shadow)]">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Mot de passe oublié</CardTitle>
            <CardDescription>
              La réinitialisation par email sera activée avec Resend (phase auth complète).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login" className="text-sm font-medium text-[var(--studelio-blue)] hover:underline">
              ← Retour à la connexion
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
