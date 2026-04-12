"use client";

import { useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import type { Role } from "@prisma/client";
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

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!res?.ok) {
      setLoading(false);
      setError(
        res?.error === "CredentialsSignin"
          ? "Email ou mot de passe incorrect."
          : "Connexion impossible. Vérifie ta connexion ou réessaie dans un instant.",
      );
      return;
    }

    const session = await getSession();
    const role = session?.user?.role as Role | undefined;
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

    setLoading(false);
    // Navigation complète : le cookie de session est bien pris en compte par le middleware (évite les retours silencieux sur /login).
    window.location.assign(target);
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
