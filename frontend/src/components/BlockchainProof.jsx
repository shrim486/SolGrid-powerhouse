import React, { useMemo, useState } from "react";
import { Check, Copy, Link2, ShieldCheck } from "lucide-react";
import {
  computeRecordHash,
  shortenAddress,
  shortenHash,
  verifyLedgerChain,
} from "../utils/gridLogic.js";

export default function BlockchainProof({
  ledgerBlocks,
  contractConfig,
  chainOnline,
}) {
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [chainCheckResult, setChainCheckResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState("");

  const latestBlock = ledgerBlocks?.[0] || null;
  const inspectedBlock = useMemo(() => {
    if (!ledgerBlocks || ledgerBlocks.length === 0) return null;
    return (
      ledgerBlocks.find((b) => b.id === selectedBlockId) || ledgerBlocks[0]
    );
  }, [ledgerBlocks, selectedBlockId]);

  const recomputedDigest = useMemo(() => {
    if (!inspectedBlock || inspectedBlock.source !== "keccak256-chain") {
      return "";
    }
    return computeRecordHash(inspectedBlock.payload);
  }, [inspectedBlock]);

  async function handleCopy(key, value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(""), 1800);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  }

  function handleVerifyChain() {
    const result = verifyLedgerChain(ledgerBlocks);
    setChainCheckResult(result);
  }

  const tokenAddr = contractConfig?.energyToken?.address || "";
  const marketAddr = contractConfig?.energyMarketplace?.address || "";

  return (
    <section
      aria-labelledby="blockchain-proof-heading"
      data-testid="blockchain-proof-section"
      className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6"
    >
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>
              {chainOnline
                ? "Verified Ethereum Localhost (Chain 31337)"
                : "Keccak-256 Linked Block Ledger · Chain 31337"}
            </span>
          </div>
          <h2
            id="blockchain-proof-heading"
            className="mt-1 text-base font-semibold text-white"
          >
            Blockchain Verification &amp; Cryptographic Proof
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Every solar reading and energy trade is hashed with Keccak-256 and chained to the
            previous block hash, creating a tamper-evident ledger backed by Solidity smart contracts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleVerifyChain}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Verify Chain Integrity
        </button>
      </div>

      {/* Interactive Chain Verification Status Banner */}
      {chainCheckResult && (
        <div
          role="status"
          data-testid="chain-verify-status"
          className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-xs ${
            chainCheckResult.valid
              ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-200"
              : "border-red-500/40 bg-red-950/60 text-red-200"
          }`}
        >
          <span className="font-medium">
            {chainCheckResult.valid
              ? `Cryptographic integrity verified across all ${chainCheckResult.verifiedCount} blocks (Keccak-256 digests and parent links match).`
              : `Hash mismatch detected at Block #${chainCheckResult.brokenBlockNumber}.`}
          </span>
          <button
            type="button"
            onClick={() => setChainCheckResult(null)}
            className="underline underline-offset-2 opacity-80 hover:opacity-100 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* 3-Column Smart Contract & Consensus Anchors */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">
              EnergyToken (NRG) Contract
            </span>
            <button
              type="button"
              onClick={() => handleCopy("token", tokenAddr)}
              aria-label="Copy EnergyToken contract address"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
            >
              {copiedKey === "token" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-2 font-mono text-sm font-medium text-white tabular-nums">
            {shortenAddress(tokenAddr)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            ERC-20 standard · 1 NRG = 1 kWh
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">
              EnergyMarketplace Contract
            </span>
            <button
              type="button"
              onClick={() => handleCopy("market", marketAddr)}
              aria-label="Copy EnergyMarketplace contract address"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
            >
              {copiedKey === "market" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-2 font-mono text-sm font-medium text-white tabular-nums">
            {shortenAddress(marketAddr)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Solidity 0.8.20 · Non-custodial ETH/NRG swap
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">
              Latest Block Anchor
            </span>
            <span className="font-mono text-xs text-amber-400 tabular-nums">
              {latestBlock ? `Block #${latestBlock.blockNumber}` : "Genesis"}
            </span>
          </div>
          <p className="mt-2 font-mono text-sm font-medium text-emerald-400 tabular-nums">
            {latestBlock ? shortenHash(latestBlock.txHash) : "0x0000...0000"}
          </p>
          <p className="mt-1 text-xs text-slate-400 tabular-nums">
            Keccak-256 · Links to{" "}
            <span className="font-mono text-slate-300">
              {latestBlock ? shortenHash(latestBlock.parentHash, 6, 4) : "0x0000"}
            </span>
          </p>
        </div>
      </div>

      {/* Immutable Hash Chain Table + Cryptographic Proof Inspector */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">
              Immutable Hash Chain
            </h3>
            <span className="text-xs text-slate-400 tabular-nums">
              Select a block to verify its digest
            </span>
          </div>

          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2 pr-3 font-medium">Block</th>
                <th className="pb-2 px-2 font-medium">Event</th>
                <th className="pb-2 px-2 font-medium">Record / Tx Hash</th>
                <th className="pb-2 px-2 font-medium">Parent Hash</th>
                <th className="pb-2 pl-2 text-right font-medium">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(ledgerBlocks || []).slice(0, 6).map((block) => {
                const isSelected = inspectedBlock?.id === block.id;
                return (
                  <tr
                    key={block.id}
                    data-testid={`block-row-${block.blockNumber}`}
                    className={`transition-colors ${
                      isSelected ? "bg-emerald-500/10" : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="py-2.5 pr-3 font-mono font-semibold text-amber-400 tabular-nums whitespace-nowrap">
                      #{block.blockNumber}
                    </td>
                    <td className="py-2.5 px-2 text-slate-200 whitespace-nowrap">
                      {block.eventType}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-emerald-400 tabular-nums whitespace-nowrap">
                      {shortenHash(block.txHash, 8, 6)}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                      {shortenHash(block.parentHash, 8, 4)}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedBlockId(block.id)}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? "bg-emerald-500 text-slate-950 font-semibold"
                            : "border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600"
                        }`}
                      >
                        {isSelected ? "Inspecting" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cryptographic Proof Inspector */}
        <div
          data-testid="hash-proof-inspector"
          className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-950/80 p-4"
        >
          {inspectedBlock ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Link2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>Block #{inspectedBlock.blockNumber} Proof</span>
                </div>
                <span className="font-mono text-emerald-400">
                  {inspectedBlock.source === "ethereum-rpc"
                    ? "On-Chain Confirmed"
                    : recomputedDigest === inspectedBlock.txHash
                    ? "Keccak-256 Match"
                    : "Hash Mismatch"}
                </span>
              </div>

              <div>
                <p className="text-slate-400">Transaction / Block Hash</p>
                <p className="mt-1 break-all rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300">
                  {inspectedBlock.txHash}
                </p>
              </div>

              <div>
                <p className="text-slate-400">Linked Parent Hash</p>
                <p className="mt-1 break-all rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 font-mono text-[11px] text-slate-300">
                  {inspectedBlock.parentHash}
                </p>
              </div>

              {inspectedBlock.payload && (
                <div>
                  <p className="text-slate-400">Canonical Hashed Payload</p>
                  <p className="mt-1 break-all rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 font-mono text-[11px] text-amber-200/90">
                    {inspectedBlock.payload}
                  </p>
                </div>
              )}

              <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
                Trust comes from cryptographic chaining: altering any kWh figure or address
                changes this Keccak-256 hash and invalidates every subsequent block link.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Select a block to inspect its Keccak-256 hash proof.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
