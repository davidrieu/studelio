import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";

function homeForRole(role: Role): string {
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

function firstParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

/** Évite les redirections ouvertes : uniquement des chemins internes cohérents avec le rôle. */
function safeNext(path: string | null | undefined, role: Role): string | null {
  if (!path || path.length < 2) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("://")) return null;

  if (role === "STUDENT") {
    if (path.startsWith("/app") || path.startsWith("/onboarding")) return path;
  }
  if (role === "PARENT" && path.startsWith("/parent")) return path;
  if ((role === "ADMIN" || role === "CORRECTOR") && path.startsWith("/admin")) return path;
  return null;
}

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?error=session");
  }

  const role = session.user.role as Role;
  const next = safeNext(firstParam(searchParams.next), role);
  redirect(next ?? homeForRole(role));
}
