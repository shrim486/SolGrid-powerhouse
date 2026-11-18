import React, { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  calculateOrderTotalEth,
  formatEth,
  formatKwh,
  shortenAddress,
  validateSellOrder,
} from "../utils/gridLogic.js";

export default function TradingPanels({
  connected,
  nrgBalance,
  listings,
  selectedHouseId,
  houses,
  isSubmittingSell,
  buyingListingId,
  onListEnergy,
  onBuyEnergy,
}) {
  const [amountInput, setAmountInput] = useState("");
  const [priceInput, setPriceInput] = useState("0.002");
  const [formError, setFormError] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const orderTotalEth = calculateOrderTotalEth(amountInput, priceInput);

  const displayedListings = useMemo(() => {
    const copy = [...listings];
    if (sortBy === "price") {
      copy.sort((a, b) => a.pricePerKwh - b.pricePerKwh);
    }
    return copy;
  }, [listings, sortBy]);

  const selectedHouseAddress = houses?.[selectedHouseId]?.toLowerCase() || "";

  async function handleSellSubmit(event) {
    event.preventDefault();
    setFormError("");

    const check = validateSellOrder({
      connected,
      amountInput,
      priceInput,
      availableNrg: nrgBalance,
    });

    if (!check.valid) {
      setFormError(check.error);
      return;
    }

    const result = await onListEnergy(check.amount, check.price);
    if (result?.error) {
      setFormError(result.error);
      return;
    }

    setAmountInput("");
  }

  function applyQuickAmount(kwh) {
    setFormError("");
    setAmountInput(String(kwh));
  }

  const maxWholeNrg = Math.floor(Number(nrgBalance) || 0);

  return (
    <section
      aria-label="Peer-to-peer energy trading"
      className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch"
    >
      {/* Left Box: Sell Power */}
      <div className="lg:col-span-5 flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950/60 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-white">Sell Power</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              List surplus solar NRG for neighbors to purchase.
            </p>
          </div>
          <span className="font-mono text-xs font-medium text-emerald-400 tabular-nums whitespace-nowrap pt-0.5">
            {connected ? `${formatKwh(nrgBalance)} NRG` : "Wallet disconnected"}
          </span>
        </div>

        <form
          onSubmit={handleSellSubmit}
          className="flex flex-1 flex-col gap-4 p-5 sm:p-6"
          noValidate
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="sell-amount-kwh"
                className="block text-sm font-medium text-slate-200"
              >
                Amount in kWh
              </label>
              <div className="flex items-center gap-1.5">
                {[2, 4, 6].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyQuickAmount(preset)}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
                {connected && maxWholeNrg > 0 && (
                  <button
                    type="button"
                    onClick={() => applyQuickAmount(maxWholeNrg)}
                    className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 cursor-pointer"
                  >
                    Max
                  </button>
                )}
              </div>
            </div>
            <input
              id="sell-amount-kwh"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="e.g. 4"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                if (formError) setFormError("");
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="sell-price-eth"
              className="block text-sm font-medium text-slate-200"
            >
              Price in ETH (per kWh)
            </label>
            <input
              id="sell-price-eth"
              type="number"
              min="0.0001"
              step="0.0001"
              inputMode="decimal"
              placeholder="e.g. 0.002"
              value={priceInput}
              onChange={(e) => {
                setPriceInput(e.target.value);
                if (formError) setFormError("");
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-300">
            <span>Estimated Order Value</span>
            <span className="font-mono font-semibold text-white tabular-nums">
              {formatEth(orderTotalEth)} ETH
            </span>
          </div>

          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/60 px-3 py-2.5 text-sm text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <div className="mt-auto pt-1">
            <button
              type="submit"
              disabled={isSubmittingSell}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 cursor-pointer"
            >
              {isSubmittingSell ? "Listing Energy..." : "List Power for Sale"}
            </button>
          </div>
        </form>
      </div>

      {/* Right Box: Buy Power from Neighbors */}
      <div className="lg:col-span-7 flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90">
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-white">
              Buy Power from Neighbors
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {listings.length} active {listings.length === 1 ? "offer" : "offers"} available
            </p>
          </div>

          <div
            className="inline-flex items-center self-start rounded-lg border border-slate-800 bg-slate-950 p-1 sm:self-auto"
            role="group"
            aria-label="Sort neighbor listings"
          >
            <button
              type="button"
              onClick={() => setSortBy("recent")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                sortBy === "recent"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => setSortBy("price")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                sortBy === "price"
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Lowest Price
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-5 sm:p-6">
          {displayedListings.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-800 px-4 text-center text-sm text-slate-400">
              No active sell orders right now. List power on the left or wait for a neighbor offer.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
                  <th className="pb-2.5 pr-4 font-medium">Seller</th>
                  <th className="pb-2.5 px-3 text-right font-medium">Available</th>
                  <th className="pb-2.5 px-3 text-right font-medium">Price / kWh</th>
                  <th className="pb-2.5 px-3 text-right font-medium">Total</th>
                  <th className="pb-2.5 pl-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {displayedListings.map((listing) => {
                  const isBuyingThis = buyingListingId === listing.id;
                  const isHighlighted =
                    selectedHouseAddress &&
                    listing.seller?.toLowerCase() === selectedHouseAddress;

                  return (
                    <tr
                      key={listing.id}
                      data-testid={`listing-row-${listing.id}`}
                      className={`transition-colors ${
                        isHighlighted ? "bg-amber-500/10" : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-3.5 pr-4">
                        <div className="font-mono text-sm font-medium text-white">
                          {shortenAddress(listing.seller)}
                        </div>
                        {listing.sellerLabel && (
                          <div className="text-xs text-slate-400">{listing.sellerLabel}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-100 tabular-nums whitespace-nowrap">
                        {formatKwh(listing.amount)} kWh
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                        {formatEth(listing.pricePerKwh)} ETH
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-white tabular-nums whitespace-nowrap">
                        {formatEth(listing.totalPrice)} ETH
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <button
                          type="button"
                          onClick={() => onBuyEnergy(listing)}
                          disabled={buyingListingId !== null}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 whitespace-nowrap cursor-pointer"
                        >
                          {isBuyingThis ? "Buying..." : "Buy Now"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
