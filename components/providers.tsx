"use client";

import { SessionProvider } from "next-auth/react";
import { AccessibilityToolbar } from "@/components/accessibility-toolbar";
import type { A11yPreferences } from "@/lib/a11y-preferences";

export function Providers({
  children,
  a11y,
}: {
  children: React.ReactNode;
  a11y: A11yPreferences;
}) {
  return (
    <SessionProvider>
      {children}
      <AccessibilityToolbar initial={a11y} />
    </SessionProvider>
  );
}
