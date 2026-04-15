"use client";

import { SessionProvider } from "next-auth/react";
import { AccessibilityToolbar } from "@/components/accessibility-toolbar";
import { A11Y_VISUAL_ROOT_ID, type A11yPreferences } from "@/lib/a11y-preferences";

export function Providers({
  children,
  a11y,
}: {
  children: React.ReactNode;
  a11y: A11yPreferences;
}) {
  return (
    <SessionProvider>
      <div id={A11Y_VISUAL_ROOT_ID} className="min-h-screen w-full">
        {children}
      </div>
      <AccessibilityToolbar initial={a11y} />
    </SessionProvider>
  );
}
