import React from "react";
import { Sun, Wallet } from "lucide-react";
import { formatEth, formatKwh, shortenAddress } from "../utils/gridLogic.js";

export default function TopBar({
  connected,
  account,
  ethBalance,
  nrgBalance,
  modeLabel,
  isConnecting,
  onConnect,
  onDisconnect,
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6 lg:gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-400">
            <Sun className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-base sm:text-lg font-bold tracking-tight text-white">
            SolGrid P2P Energy
          </span>
        </div>

        <div className="hidden md:flex items-center gap-3 text-sm text-slate-300 tabular-nums whitespace-nowrap">
          {connected ? (
            <>
              <span className="font-mono font-medium text-white">
                {shortenAddress(account)}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="font-mono text-slate-200">
                {formatEth(ethBalance)} ETH
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="font-mono font-semibold text-emerald-400">
                {formatKwh(nrgBalance)} NRG
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-xs text-slate-400">{modeLabel}</span>
            </>
          ) : (
            <>
              <span>Neighborhood Microgrid</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span>Chain ID 31337</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-slate-400">Wallet disconnected</span>
            </>
          )}
        </div>

        <div className="flex items-center shrink-0">
          {connected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs sm:px-4 sm:text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Disconnect<span className="hidden sm:inline"> Wallet</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs sm:px-4 sm:text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" />
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </button>
          )}
        </div>
      </div>

      {connected && (
        <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-300 tabular-nums md:hidden flex flex-wrap items-center gap-2">
          <span className="font-mono font-medium text-white">
            {shortenAddress(account)}
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono">{formatEth(ethBalance)} ETH</span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span className="font-mono font-semibold text-emerald-400">
            {formatKwh(nrgBalance)} NRG
          </span>
        </div>
      )}
    </header>
  );
}
