"use client";

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
      fill: "var(--chart-streak, #f59e0b)",
    },
    {
      key: "time",
      label: "Temps Studelio",
      pct: pct(totalMinutes, MINUTES_CAP),
      rawLine: totalMinutesFormatted,
      fill: "var(--chart-time, #2451b0)",
    },
    {
      key: "chat",
      label: "Discussions André",
      pct: pct(chatSessionsCount, CHAT_CAP),
      rawLine: `${chatSessionsCount} conversation${chatSessionsCount > 1 ? "s" : ""}`,
      fill: "var(--chart-chat, #7c3aed)",
    },
    {
      key: "blanc",
      label: blancAxisLabel,
      pct: pct(blancEnrollmentsCount, BLANC_CAP),
      rawLine: `${blancEnrollmentsCount} inscription${blancEnrollmentsCount > 1 ? "s" : ""}`,
      fill: "var(--chart-blanc, #e11d48)",
    },
  ];
}

function radarFromRows(rows: Row[]) {
  return rows.map((r) => ({
    subject: r.label.length > 14 ? `${r.label.slice(0, 12)}…` : r.label,
    full: r.pct,
  }));
}

export function StudentDashboardCharts(props: {
  streakDays: number;
  totalMinutes: number;
  totalMinutesFormatted: string;
  chatSessionsCount: number;
  blancEnrollmentsCount: number;
  /** Libellé court pour l’axe (ex. « Bac blanc ») */
  blancAxisLabel: string;
}) {
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
    <div className="flex flex-col gap-6">
      <div className="rounded-[24px] border border-[var(--studelio-border)] bg-card/80 p-4 shadow-[var(--studelio-shadow)] backdrop-blur-sm sm:p-5">
        <h3 className="font-display text-sm font-semibold text-[var(--studelio-text)]">Profil d’engagement</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Vue radar (échelle relative, plafonds indicatifs : série 14 j., temps 12 h, etc.).
        </p>
        <div className="mt-2 h-[min(280px,55vw)] w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="52%" outerRadius="78%" data={radarData}>
              <PolarGrid stroke="var(--studelio-border)" strokeOpacity={0.9} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--studelio-text-muted)", fontSize: 10 }} />
              <Radar
                name="Engagement"
                dataKey="full"
                stroke="var(--studelio-blue)"
                fill="var(--studelio-blue)"
                fillOpacity={0.22}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[24px] border border-[var(--studelio-border)] bg-card/80 p-4 shadow-[var(--studelio-shadow)] backdrop-blur-sm sm:p-5">
        <h3 className="font-display text-sm font-semibold text-[var(--studelio-text)]">Volume par indicateur</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Barres = progression vers un repère visuel (pas une note). Survole une barre pour le détail.
        </p>
        <div className="mt-3 h-[min(280px,55vw)] w-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              barCategoryGap={14}
            >
              <CartesianGrid strokeDasharray="4 6" horizontal={false} stroke="var(--studelio-border)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--studelio-text-muted)" }} />
              <YAxis
                type="category"
                dataKey="label"
                width={118}
                tick={{ fontSize: 10, fill: "var(--studelio-text-body)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--studelio-blue-dim)", opacity: 0.35 }}
                content={(tooltipProps) => {
                  if (!tooltipProps.active || !tooltipProps.payload?.length) return null;
                  const p = tooltipProps.payload[0].payload as Row;
                  return (
                    <div className="rounded-xl border border-[var(--studelio-border)] bg-card px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-[var(--studelio-text)]">{p.label}</p>
                      <p className="mt-0.5 text-[var(--studelio-text-body)]">{p.rawLine}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{p.pct} % du repère visuel</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pct" radius={[0, 10, 10, 0]} barSize={22}>
                {rows.map((r) => (
                  <Cell key={r.key} fill={r.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
