import test from "node:test";
import assert from "node:assert/strict";
import {
  shortenAddress,
  shortenHash,
  computeRecordHash,
  verifyLedgerChain,
  calculateOrderTotalEth,
  validateSellOrder,
  createInitialPreviewState,
  applySolarGenerationTick,
  applyCreateListing,
  applyBuyListing,
} from "./gridLogic.js";

test("shortenAddress and shortenHash format hex strings concisely", () => {
  assert.equal(
    shortenAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"),
    "0xf39F...2266"
  );
  assert.equal(shortenAddress(""), "");
  assert.equal(
    shortenHash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"),
    "0x12345678...90abcdef"
  );
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

test("solar generation, listing creation, and energy purchase append verifiable Keccak-256 blocks", () => {
  const initial = createInitialPreviewState({});
  assert.equal(initial.listings.length, 2);
  assert.equal(initial.ledgerBlocks.length, 4);

  const initialVerify = verifyLedgerChain(initial.ledgerBlocks);
  assert.equal(initialVerify.valid, true);
  assert.equal(initialVerify.verifiedCount, 4);

  const afterSolar = applySolarGenerationTick(initial, 4, initial.houseA, "10:25");
  assert.equal(afterSolar.totalSolarGeneratedKwh, 30);
  assert.equal(afterSolar.nrgBalance, 16);
  assert.equal(afterSolar.ledgerBlocks.length, 5);
  assert.equal(afterSolar.ledgerBlocks[0].parentHash, initial.ledgerBlocks[0].txHash);

  const afterList = applyCreateListing(afterSolar, initial.houseA, 5, 0.002, "10:26:00");
  assert.equal(afterList.nrgBalance, 11);
  assert.equal(afterList.listings.length, 3);
  assert.equal(afterList.ledgerBlocks[0].eventType, "EnergyListed");

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
  assert.equal(afterBuy.ledgerBlocks[0].eventType, "EnergyPurchased");

  const chainCheck = verifyLedgerChain(afterBuy.ledgerBlocks);
  assert.equal(chainCheck.valid, true);
  assert.equal(chainCheck.verifiedCount, 7);

  // Tampering with payload must fail Keccak-256 verification
  const tampered = afterBuy.ledgerBlocks.map((b, idx) =>
    idx === 2 ? { ...b, payload: b.payload.replace("4", "99") } : b
  );
  const tamperedCheck = verifyLedgerChain(tampered);
  assert.equal(tamperedCheck.valid, false);
  assert.equal(computeRecordHash("test").length, 66);
});
