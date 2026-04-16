"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, CalendarDays, ChevronRight, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const MotionLink = motion(Link);

type TileTheme = {
  /** Classes pour le halo en coin */
  orb: string;
  /** Dégradé sous l’icône */
  iconBg: string;
  /** Ombre colorée de l’icône */
  iconShadow: string;
  /** Anneau au survol */
  hoverRing: string;
  /** Barre lumineuse en bas */
  bar: string;
};

const themes: Record<"andre" | "seance" | "dictee" | "blanc", TileTheme> = {
  andre: {
    orb: "bg-violet-500/25 blur-2xl",
    iconBg: "bg-gradient-to-br from-violet-400 to-indigo-600",
    iconShadow: "shadow-lg shadow-violet-500/35",
    hoverRing: "group-hover:ring-violet-400/30",
    bar: "from-violet-500 to-indigo-500",
  },
  seance: {
    orb: "bg-[var(--studelio-blue)]/20 blur-2xl",
    iconBg: "bg-gradient-to-br from-[#4f7ae8] to-[#2451b0]",
    iconShadow: "shadow-lg shadow-[#2451b0]/30",
    hoverRing: "group-hover:ring-[var(--studelio-blue)]/35",
    bar: "from-[#5c85eb] to-[#2451b0]",
  },
  dictee: {
    orb: "bg-teal-400/20 blur-2xl",
    iconBg: "bg-gradient-to-br from-teal-400 to-emerald-600",
    iconShadow: "shadow-lg shadow-teal-500/30",
    hoverRing: "group-hover:ring-teal-400/35",
    bar: "from-teal-400 to-emerald-600",
  },
  blanc: {
    orb: "bg-rose-500/20 blur-2xl",
    iconBg: "bg-gradient-to-br from-rose-400 to-rose-700",
    iconShadow: "shadow-lg shadow-rose-500/30",
    hoverRing: "group-hover:ring-rose-400/35",
    bar: "from-rose-400 to-rose-600",
  },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 26 },
  },
};

export function StudentDashboardQuickLinks({ epreuveShortLabel }: { epreuveShortLabel: string }) {
  const tiles = [
    {
      id: "andre" as const,
      href: "/app/andre",
      title: "André",
      description: "Questions, exposés, rédactions — ton coach français.",
      Icon: Sparkles,
    },
    {
      id: "seance" as const,
      href: "/app/programme/seance",
      title: "Séance programme",
      description: "André mène les exercices sur ton parcours — points radar au fil des réponses.",
      Icon: BookOpen,
    },
    {
      id: "dictee" as const,
      href: "/app/dictee",
      title: "Dictée",
      description: "Audio, correction, progrès sur le programme.",
      Icon: Mic,
    },
    {
      id: "blanc" as const,
      href: "/app/bac-blanc",
      title: epreuveShortLabel,
      description: "Créneaux, inscriptions et suivi des épreuves.",
      Icon: CalendarDays,
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[var(--studelio-border)] bg-gradient-to-br from-[var(--studelio-bg-soft)]/90 via-card to-[var(--studelio-bg-muted)]/40 p-4 shadow-[var(--studelio-shadow)] sm:p-5">
      <div
        className="pointer-events-none absolute -right-24 top-0 h-48 w-48 rounded-full bg-[var(--studelio-blue)]/[0.08] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-violet-500/[0.06] blur-3xl"
        aria-hidden
      />

      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-2 sm:mb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--studelio-border)] bg-card/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            Raccourcis
          </div>
          <h2
            id="quick-links-heading"
            className="mt-2 font-display text-xl font-semibold tracking-tight text-[var(--studelio-text)] sm:text-2xl"
          >
            Accès rapide
          </h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Un clic pour rejoindre l’essentiel — interfaces pensées pour te faire gagner du temps.
          </p>
        </div>
      </div>

      <motion.ul
        variants={container}
        initial="hidden"
        animate="show"
        className="relative grid grid-cols-2 gap-3 sm:gap-4"
      >
        {tiles.map((tile) => {
          const t = themes[tile.id];
          const Icon = tile.Icon;
          return (
            <motion.li key={tile.href} variants={item} className="min-w-0">
              <MotionLink
                href={tile.href}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className={cn(
                  "group relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-2xl border p-3.5 sm:min-h-[148px] sm:p-4",
                  "border-white/40 bg-white/50 shadow-md backdrop-blur-md",
                  "dark:border-white/[0.08] dark:bg-white/[0.06]",
                  "ring-1 ring-transparent transition-shadow duration-300",
                  "hover:shadow-xl hover:shadow-[var(--studelio-blue)]/5",
                  t.hoverRing,
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                    t.orb,
                  )}
                  aria-hidden
                />
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 h-[3px] rounded-b-2xl bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-90",
                    t.bar,
                  )}
                  aria-hidden
                />

                <div className="relative z-10 flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white sm:h-11 sm:w-11 sm:rounded-2xl",
                      t.iconBg,
                      t.iconShadow,
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--studelio-border)]/60 bg-card/70 text-muted-foreground transition-all duration-300 group-hover:border-[var(--studelio-blue)]/25 group-hover:bg-[var(--studelio-blue-dim)] group-hover:text-[var(--studelio-blue)]">
                    <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>

                <div className="relative z-10 mt-3 min-w-0">
                  <span className="font-display text-sm font-bold leading-tight tracking-tight text-[var(--studelio-text)] sm:text-base">
                    {tile.title}
                  </span>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                    {tile.description}
                  </p>
                </div>
              </MotionLink>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
