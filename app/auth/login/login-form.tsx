"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
import { fetchAuthSession } from "@/lib/auth-session-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function homeForRole(role: Role | undefined): string {
  switch (role) {
    case "PARENT":
      return "/parent/dashboard";
    case "ADMIN":
    case "CORRECTOR":
      return "/admin/dashboard";
    default:
      return "/app/dashboard";
  }
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackUrl");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).toLowerCase().trim();
    const password = fd.get("password") as string;

    const origin = window.location.origin;
    const safeCallbackUrl = `${origin}/auth/login`;

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });

      if (!res?.ok) {
        setError(
          res?.error === "CredentialsSignin"
            ? "Email ou mot de passe incorrect."
            : res?.error
              ? `Connexion refusée (${res.error}).`
              : "Connexion impossible. Vérifie ta connexion ou réessaie dans un instant.",
        );
        return;
      }

      const session = await fetchAuthSession();
      const role = session?.user?.role as Role | undefined;
      if (!session?.user?.id) {
        setError(
          "La connexion semble réussir mais aucune session n’est enregistrée (cookie bloqué ou configuration serveur). Vérifie sur Vercel que AUTH_SECRET et AUTH_URL correspondent exactement à ton site, puis réessaie ou teste en navigation privée.",
        );
        return;
      }

      const fallback = homeForRole(role);
      let target = fallback;
      if (requestedCallback && role === "STUDENT" && requestedCallback.startsWith("/app")) {
        target = requestedCallback;
      }
      if (requestedCallback && role === "PARENT" && requestedCallback.startsWith("/parent")) {
        target = requestedCallback;
      }
      if (requestedCallback && (role === "ADMIN" || role === "CORRECTOR") && requestedCallback.startsWith("/admin")) {
        target = requestedCallback;
      }

      window.location.assign(target);
    } catch {
      setError("Une erreur technique est survenue pendant la connexion. Actualise la page et réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-[var(--studelio-border)] shadow-[var(--studelio-shadow)]">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Connexion</CardTitle>
        <CardDescription>Accède à ton espace Studelio.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {searchParams.get("error") === "role" ? (
            <p className="text-sm text-destructive">Ce compte n’a pas accès à cette zone.</p>
          ) : null}
          {searchParams.get("session") === "required" ? (
            <p className="text-sm text-muted-foreground">Identifie-toi pour accéder à cette page.</p>
          ) : null}
          {searchParams.get("error") === "Configuration" ? (
            <p className="text-sm text-destructive">
              Erreur de configuration d’authentification (souvent AUTH_SECRET ou AUTH_URL manquant sur le serveur).
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
