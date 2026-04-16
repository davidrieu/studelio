"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STREAK_CAP = 14;
const MINUTES_CAP = 720;
const CHAT_CAP = 40;
const BLANC_CAP = 8;

/** Hauteur du tracé (px) ; marges Recharts + padding carte pour les libellés. */
const CHART_H_DEFAULT = 212;
const CHART_H_COMPACT = 196;

const springEase = [0.22, 1, 0.36, 1] as const;

function pct(raw: number, cap: number) {
  if (cap <= 0) return 0;
  return Math.min(100, Math.round((raw / cap) * 100));
}

type Row = {
  key: string;
  label: string;
  pct: number;
  rawLine: string;
  fill: string;
};

function buildRows(
  streakDays: number,
  totalMinutes: number,
  totalMinutesFormatted: string,
  chatSessionsCount: number,
  blancEnrollmentsCount: number,
  blancAxisLabel: string,
): Row[] {
  return [
    {
      key: "streak",
      label: "Série (jours)",
      pct: pct(streakDays, STREAK_CAP),
      rawLine: `${streakDays} jour${streakDays > 1 ? "s" : ""} d’affilée`,
      fill: "#f59e0b",
    },
    {
      key: "time",
      label: "Temps Studelio",
      pct: pct(totalMinutes, MINUTES_CAP),
      rawLine: totalMinutesFormatted,
      fill: "#2451b0",
    },
    {
      key: "chat",
      label: "Discussions André",
      pct: pct(chatSessionsCount, CHAT_CAP),
      rawLine: `${chatSessionsCount} conversation${chatSessionsCount > 1 ? "s" : ""}`,
      fill: "#7c3aed",
    },
    {
      key: "blanc",
      label: blancAxisLabel,
      pct: pct(blancEnrollmentsCount, BLANC_CAP),
      rawLine: `${blancEnrollmentsCount} inscription${blancEnrollmentsCount > 1 ? "s" : ""}`,
      fill: "#e11d48",
    },
  ];
}

function radarFromRows(rows: Row[]) {
  return rows.map((r) => ({
    subject: r.label.length > 12 ? `${r.label.slice(0, 10)}…` : r.label,
    full: r.pct,
  }));
}

export function StudentDashboardCharts(props: {
  streakDays: number;
  totalMinutes: number;
  totalMinutesFormatted: string;
  chatSessionsCount: number;
  blancEnrollmentsCount: number;
  blancAxisLabel: string;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const chartH = compact ? CHART_H_COMPACT : CHART_H_DEFAULT;
  const yAxisWidth = compact ? 78 : 118;

  const rows = buildRows(
    props.streakDays,
    props.totalMinutes,
    props.totalMinutesFormatted,
    props.chatSessionsCount,
    props.blancEnrollmentsCount,
    props.blancAxisLabel,
  );
  const radarData = radarFromRows(rows);

  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-5">
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-[var(--studelio-border)] bg-gradient-to-b from-card to-[var(--studelio-bg-soft)]/40 p-4 pb-5 shadow-[var(--studelio-shadow)] sm:p-5 sm:pb-6"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: springEase }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(99,102,241,0.12),transparent_55%)]"
          aria-hidden
        />
        <h3 className="relative font-display text-sm font-semibold uppercase tracking-wide text-[var(--studelio-text)]">
          Profil d’engagement
        </h3>
        <p className="relative mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
          Échelle relative (série 14 j., temps 12 h…).
        </p>
        <div className="relative mt-2 min-h-0 pb-1" style={{ height: chartH }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="48%"
              outerRadius="76%"
              margin={{ top: 8, right: 12, bottom: 26, left: 12 }}
              data={radarData}
            >
              <defs>
                <linearGradient id="studelioRadarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.55} />
                  <stop offset="55%" stopColor="#2451b0" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2451b0" stopOpacity={0.06} />
                </linearGradient>
                <linearGradient id="studelioRadarStroke" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#2451b0" />
                </linearGradient>
              </defs>
              <PolarGrid stroke="var(--studelio-border)" strokeDasharray="3 5" strokeOpacity={0.85} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--studelio-text-muted)", fontSize: 10 }} tickLine={false} />
              <Radar
                name="Engagement"
                dataKey="full"
                stroke="url(#studelioRadarStroke)"
                fill="url(#studelioRadarFill)"
                fillOpacity={1}
                strokeWidth={2.25}
                dot={{ r: 4, strokeWidth: 1.5, fill: "#fff", stroke: "#2451b0" }}
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        className="relative overflow-hidden rounded-2xl border border-[var(--studelio-border)] bg-gradient-to-b from-card to-[var(--studelio-bg-soft)]/40 p-4 pb-5 shadow-[var(--studelio-shadow)] sm:p-5 sm:pb-6"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, delay: 0.08, ease: springEase }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(36,81,176,0.1),transparent_50%)]"
          aria-hidden
        />
        <h3 className="relative font-display text-sm font-semibold uppercase tracking-wide text-[var(--studelio-text)]">
          Volume par indicateur
        </h3>
        <p className="relative mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
          Survol pour le détail · repères visuels.
        </p>
        <div className="relative mt-2 min-h-0 pb-1" style={{ height: chartH }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rows}
              margin={
                compact ?
                  { top: 4, right: 4, left: 0, bottom: 12 }
                : { top: 4, right: 8, left: 4, bottom: 14 }
              }
              barCategoryGap={compact ? 12 : 14}
            >
              <defs>
                {rows.map((r) => (
                  <linearGradient key={r.key} id={`barGrad-${r.key}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={r.fill} stopOpacity={0.35} />
                    <stop offset="45%" stopColor={r.fill} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={r.fill} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--studelio-border)" strokeOpacity={0.8} />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="label"
                width={yAxisWidth}
                tick={{ fontSize: compact ? 9 : 10, fill: "var(--studelio-text-body)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (typeof v === "string" && v.length > 14 ? `${v.slice(0, 12)}…` : String(v))}
              />
              <Tooltip
                cursor={{ fill: "var(--studelio-blue-dim)", opacity: 0.4 }}
                content={(tooltipProps) => {
                  if (!tooltipProps.active || !tooltipProps.payload?.length) return null;
                  const p = tooltipProps.payload[0].payload as Row;
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg border border-[var(--studelio-border)] bg-card px-2.5 py-1.5 text-[11px] shadow-lg"
                    >
                      <p className="font-semibold text-[var(--studelio-text)]">{p.label}</p>
                      <p className="mt-0.5 text-[var(--studelio-text-body)]">{p.rawLine}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{p.pct} % du repère</p>
                    </motion.div>
                  );
                }}
              />
              <Bar
                dataKey="pct"
                radius={[0, 10, 10, 0]}
                barSize={19}
                isAnimationActive
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {rows.map((r) => (
                  <Cell key={r.key} fill={`url(#barGrad-${r.key})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
