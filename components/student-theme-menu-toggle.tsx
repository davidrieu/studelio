"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Moon, Sun } from "lucide-react";
import { setStudelioStudentTheme } from "@/actions/student-theme";
import { cn } from "@/lib/utils";

export function StudentThemeMenuToggle({ isDark }: { isDark: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setStudelioStudentTheme(isDark ? "light" : "dark");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--studelio-border)]",
        "bg-card/70 text-[var(--studelio-text-body)] shadow-sm transition-colors",
        "hover:border-[var(--studelio-blue)]/30 hover:bg-[var(--studelio-blue-dim)] hover:text-[var(--studelio-text)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--studelio-bg)]",
        pending && "pointer-events-none opacity-60",
      )}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-pressed={isDark}
      title={isDark ? "Mode clair" : "Mode sombre"}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden /> : <Moon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />}
    </button>
  );
}
