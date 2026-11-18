import React from "react";
import { ArrowLeftRight, Layers, Sun } from "lucide-react";
import { formatKwh } from "../utils/gridLogic.js";

export default function SummaryCards({
  totalSolarGeneratedKwh,
  activeSellOrdersCount,
  totalTradesCompleted,
}) {
  const cards = [
    {
      id: "solar-total",
      label: "Total Solar Power Generated",
      value: `${formatKwh(totalSolarGeneratedKwh)} kWh`,
      detail: "Minted 1:1 as NRG tokens on-chain",
      valueClass: "text-amber-400",
      iconBg: "bg-amber-500/15 border-amber-400/30 text-amber-400",
      Icon: Sun,
    },
    {
      id: "active-orders",
      label: "Active Sell Orders",
      value: String(activeSellOrdersCount),
      detail: "Open neighbor energy listings",
      valueClass: "text-white",
      iconBg: "bg-slate-800 border-slate-700 text-slate-300",
      Icon: Layers,
    },
    {
      id: "trades-completed",
      label: "Total Trades Completed",
      value: String(totalTradesCompleted),
      detail: "Settled P2P ETH-for-NRG swaps",
      valueClass: "text-emerald-400",
      iconBg: "bg-emerald-500/15 border-emerald-400/30 text-emerald-400",
      Icon: ArrowLeftRight,
    },
  ];

  return (
    <section aria-label="Microgrid summary metrics">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const IconComponent = card.Icon;
          return (
            <div
              key={card.id}
              data-testid={card.id}
              className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 transition-colors hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-300">{card.label}</p>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${card.iconBg}`}
                >
                  <IconComponent className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p
                className={`mt-2 font-mono text-3xl font-semibold tracking-tight tabular-nums ${card.valueClass}`}
              >
                {card.value}
              </p>
              <p className="mt-1.5 text-xs text-slate-400">{card.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
