import test from "node:test";
import assert from "node:assert/strict";
import {
  shortenAddress,
  calculateOrderTotalEth,
  validateSellOrder,
  createInitialPreviewState,
  applySolarGenerationTick,
  applyCreateListing,
  applyBuyListing,
} from "./gridLogic.js";

test("shortenAddress formats Ethereum addresses concisely", () => {
  assert.equal(
    shortenAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"),
    "0xf39F...2266"
  );
  assert.equal(shortenAddress(""), "");
});

test("calculateOrderTotalEth computes exact ETH cost", () => {
  assert.equal(calculateOrderTotalEth(5, 0.002), 0.01);
  assert.equal(calculateOrderTotalEth(0, 0.002), 0);
  assert.equal(calculateOrderTotalEth(-2, 0.002), 0);
});

test("validateSellOrder rejects disconnected, invalid, and over-balance amounts", () => {
  const disconnected = validateSellOrder({
    connected: false,
    amountInput: "4",
    priceInput: "0.002",
    availableNrg: 10,
  });
  assert.equal(disconnected.valid, false);

  const zeroAmount = validateSellOrder({
    connected: true,
    amountInput: "0",
    priceInput: "0.002",
    availableNrg: 10,
  });
  assert.equal(zeroAmount.valid, false);

  const overBalance = validateSellOrder({
    connected: true,
    amountInput: "15",
    priceInput: "0.002",
    availableNrg: 10,
  });
  assert.equal(overBalance.valid, false);

  const valid = validateSellOrder({
    connected: true,
    amountInput: "5",
    priceInput: "0.002",
    availableNrg: 10,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.amount, 5);
  assert.equal(valid.price, 0.002);
});

test("solar generation, listing creation, and energy purchase update microgrid state", () => {
  const initial = createInitialPreviewState({});
  assert.equal(initial.listings.length, 2);

  const afterSolar = applySolarGenerationTick(initial, 4, initial.houseA, "10:25");
  assert.equal(afterSolar.totalSolarGeneratedKwh, 30);
  assert.equal(afterSolar.nrgBalance, 16);
  assert.equal(afterSolar.activities[0].type, "Solar");

  const afterList = applyCreateListing(afterSolar, initial.houseA, 5, 0.002, "10:26:00");
  assert.equal(afterList.nrgBalance, 11);
  assert.equal(afterList.listings.length, 3);
  assert.equal(afterList.activities[0].type, "Listed");

  const { nextState: afterBuy, error } = applyBuyListing(
    afterList,
    0,
    initial.houseA,
    "10:27:00"
  );
  assert.equal(error, "");
  assert.equal(afterBuy.totalTradesCompleted, 2);
  assert.equal(afterBuy.listings.length, 2);
  assert.equal(afterBuy.nrgBalance, 16);
  assert.equal(afterBuy.activities[0].type, "Purchased");
});
