"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "@/actions/auth";
import { fetchAuthSession } from "@/lib/auth-session-client";

const niveaux = [
  { value: "SIXIEME", label: "6e" },
  { value: "CINQUIEME", label: "5e" },
  { value: "QUATRIEME", label: "4e" },
  { value: "TROISIEME", label: "3e" },
  { value: "SECONDE", label: "2nde" },
  { value: "PREMIERE", label: "1re" },
  { value: "TERMINALE", label: "Terminale" },
  { value: "BTS", label: "BTS" },
] as const;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<"student" | "parent">("student");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const registerRes = await registerAction(undefined, fd);
    if (!registerRes.ok) {
      setError(registerRes.message);
      setLoading(false);
      return;
    }

    const password = fd.get("password") as string;
    const origin = window.location.origin;
    const safeCallbackUrl = `${origin}/auth/register`;

    try {
      const sign = await signIn("credentials", {
        email: registerRes.email,
        password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });

      if (!sign?.ok) {
        setError(
          sign?.error === "CredentialsSignin"
            ? "Compte créé, mais la connexion a échoué. Réessaie sur la page de connexion avec le même mot de passe."
            : sign?.error
              ? `Compte créé, mais connexion refusée (${sign.error}).`
              : "Compte créé, mais la connexion automatique a échoué. Connecte-toi manuellement.",
        );
        router.push("/auth/login");
        return;
      }

      const session = await fetchAuthSession();
      if (!session?.user?.id) {
        setError(
          "Compte créé, mais la session n’a pas été enregistrée (cookies ou variables Vercel : AUTH_SECRET, AUTH_URL). Connecte-toi à la main ou réessaie en navigation privée.",
        );
        router.push("/auth/login");
        return;
      }

      window.location.assign(registerRes.redirect);
    } catch {
      setError("Une erreur technique est survenue après l’inscription. Réessaie ou connecte-toi manuellement.");
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-[var(--studelio-border)] shadow-[var(--studelio-shadow)]">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Créer un compte</CardTitle>
        <CardDescription>Studelio — français, du collège au lycée.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" name="firstName" required autoComplete="given-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" name="lastName" required autoComplete="family-name" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-muted-foreground">Tu es</legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="kind"
                  value="student"
                  checked={kind === "student"}
                  onChange={() => setKind("student")}
                />
                Élève
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="kind"
                  value="parent"
                  checked={kind === "parent"}
                  onChange={() => setKind("parent")}
                />
                Parent
              </label>
            </div>
          </fieldset>
          {kind === "student" ? (
            <div className="space-y-2">
              <Label htmlFor="niveau">Niveau scolaire</Label>
              <select
                id="niveau"
                name="niveau"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Choisir…</option>
                {niveaux.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? "Création…" : "S’inscrire"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
