"use client";

/** Session Auth.js après connexion (évite les courses avec le cache React). */
export async function fetchAuthSession() {
  const res = await fetch(`${window.location.origin}/api/auth/session`, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    user?: { id?: string; email?: string | null; role?: string };
  } | null>;
}
