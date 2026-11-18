import React, { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function SolarTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const reading = payload[0];
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-slate-400 tabular-nums">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-amber-400 tabular-nums">
        +{reading.value} kWh generated
      </p>
    </div>
  );
}

export default function SolarChart({ solarSeries, isLiveTicking }) {
  const [chartType, setChartType] = useState("bar");

  return (
    <section
      aria-labelledby="solar-chart-heading"
      className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="solar-chart-heading"
            className="text-base font-semibold text-white"
          >
            Live Solar Output
          </h2>
          <p className="text-sm text-slate-400">
            House A rooftop smart meter readings ·{" "}
            {isLiveTicking ? "Updating every 6s" : "On-chain meter feed"}
          </p>
        </div>

        <div
          className="inline-flex items-center self-start rounded-lg border border-slate-800 bg-slate-950 p-1 sm:self-auto"
          role="group"
          aria-label="Chart visualization mode"
        >
          <button
            type="button"
            onClick={() => setChartType("bar")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              chartType === "bar"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Bar View
          </button>
          <button
            type="button"
            onClick={() => setChartType("area")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              chartType === "area"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Area Trend
          </button>
        </div>
      </div>

      <div className="mt-4 h-56 w-full" data-testid="solar-chart-container">
        {solarSeries.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-800 text-sm text-slate-400">
            Waiting for first House A solar generation reading...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart
                data={solarSeries}
                margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#1e293b" }}
                  tickLine={false}
                />
                <YAxis
                  unit=" kWh"
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<SolarTooltip />}
                  cursor={{ fill: "#f59e0b", opacity: 0.08 }}
                />
                <Bar
                  dataKey="kwh"
                  name="Solar Output"
                  fill="#f59e0b"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={36}
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <AreaChart
                data={solarSeries}
                margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="solarAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#1e293b" }}
                  tickLine={false}
                />
                <YAxis
                  unit=" kWh"
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<SolarTooltip />} />
                <Area
                  type="monotone"
                  dataKey="kwh"
                  name="Solar Output"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#solarAreaGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
