import React, { useMemo, useState } from "react";

const TYPE_STYLES = {
  Solar: "text-amber-400",
  Listed: "text-sky-400",
  Purchased: "text-emerald-400",
};

const FILTERS = ["All", "Solar", "Listed", "Purchased"];

export default function ActivityLog({ activities }) {
  const [filterType, setFilterType] = useState("All");

  const filteredActivities = useMemo(() => {
    if (filterType === "All") return activities;
    return activities.filter((entry) => entry.type === filterType);
  }, [activities, filterType]);

  return (
    <section
      aria-labelledby="activity-log-heading"
      className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="activity-log-heading"
            className="text-base font-semibold text-white"
          >
            Live Activity Log
          </h2>
          <p className="text-sm text-slate-400">
            Plain-English feed of neighborhood solar generation and P2P trades ·{" "}
            {filteredActivities.length} events
          </p>
        </div>

        <div
          className="inline-flex items-center self-start rounded-lg border border-slate-800 bg-slate-950 p-1 sm:self-auto"
          role="group"
          aria-label="Filter activity log by type"
        >
          {FILTERS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filterType === type
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 divide-y divide-slate-800/80" data-testid="activity-log-list">
        {filteredActivities.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No {filterType === "All" ? "" : `${filterType.toLowerCase()} `}events recorded yet.
          </p>
        ) : (
          filteredActivities.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-baseline gap-2.5 text-sm">
                <span
                  className={`font-semibold shrink-0 ${TYPE_STYLES[entry.type] || "text-slate-300"}`}
                >
                  {entry.type}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-200">{entry.message}</span>
              </div>
              <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                {entry.time}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
