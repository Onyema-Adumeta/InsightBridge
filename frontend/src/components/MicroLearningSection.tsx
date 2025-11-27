"use client";

import React from "react";
import { BookOpen, TrendingUp, Activity, HelpCircle } from "lucide-react";
import Link from "next/link";

type ExplainerKey =
  | "gross_margin"
  | "current_ratio"
  | "free_cash_flow"
  | "ebitda"
  | "operating_margin"
  | "debt_to_equity";

interface MicroLearningSectionProps {
  explainers?: string[]; // slugs from backend, e.g. ["gross_margin", "current_ratio"]
}

const EXPLAINER_DEFINITIONS: Record<
  ExplainerKey,
  {
    key: ExplainerKey;
    title: string;
    subtitle: string;
    pill: string;
    icon: React.ReactNode;
    href: string;
  }
> = {
  gross_margin: {
    key: "gross_margin",
    title: "Gross Margin",
    subtitle: "How much profit you keep after direct costs.",
    pill: "Profitability",
    icon: <TrendingUp className="w-5 h-5" />,
    href: "/help-center#gross-margin",
  },
  current_ratio: {
    key: "current_ratio",
    title: "Current Ratio",
    subtitle: "Can you cover short-term obligations comfortably?",
    pill: "Liquidity",
    icon: <Activity className="w-5 h-5" />,
    href: "/help-center#current-ratio",
  },
  free_cash_flow: {
    key: "free_cash_flow",
    title: "Free Cash Flow",
    subtitle: "Cash left after essential investments.",
    pill: "Cash Health",
    icon: <Activity className="w-5 h-5" />,
    href: "/help-center#free-cash-flow",
  },
  ebitda: {
    key: "ebitda",
    title: "EBITDA",
    subtitle: "Core operating performance before financing & taxes.",
    pill: "Performance",
    icon: <TrendingUp className="w-5 h-5" />,
    href: "/help-center#ebitda",
  },
  operating_margin: {
    key: "operating_margin",
    title: "Operating Margin",
    subtitle: "Profit after operating expenses – a key efficiency signal.",
    pill: "Efficiency",
    icon: <TrendingUp className="w-5 h-5" />,
    href: "/help-center#operating-margin",
  },
  debt_to_equity: {
    key: "debt_to_equity",
    title: "Debt to Equity",
    subtitle: "How leveraged the business is versus owners’ capital.",
    pill: "Leverage",
    icon: <Activity className="w-5 h-5" />,
    href: "/help-center#debt-to-equity",
  },
};

export default function MicroLearningSection({
  explainers,
}: MicroLearningSectionProps) {
  // Normalize backend slugs (defensive)
  const normalized = (explainers ?? [])
    .map((e) => e?.toLowerCase().trim().replace(/\s+/g, "_"))
    .filter(Boolean) as ExplainerKey[];

  // If backend gave us explainers, use only those definitions.
  // Otherwise, fall back to 3 default cards.
  const cards =
    normalized.length > 0
      ? normalized
          .map((key) => EXPLAINER_DEFINITIONS[key])
          .filter(Boolean)
      : [
          EXPLAINER_DEFINITIONS.gross_margin,
          EXPLAINER_DEFINITIONS.current_ratio,
          EXPLAINER_DEFINITIONS.free_cash_flow,
        ];

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Micro-learning based on your numbers
          </h3>
        </div>
        <Link
          href="/help-center"
          className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1"
        >
          <HelpCircle className="w-4 h-4" />
          Open Help Center
        </Link>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        We’ve picked these topics because they mattered most in your latest
        upload.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="group rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-sm hover:shadow-md transition-shadow px-3 py-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/40 p-1.5 text-indigo-600 dark:text-indigo-300">
                  {card.icon}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {card.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {card.subtitle}
                  </p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                {card.pill}
              </span>
            </div>
            <span className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-300 group-hover:underline">
              Learn more →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
