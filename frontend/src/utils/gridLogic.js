import { keccak256, toUtf8Bytes } from "ethers";

export const GENESIS_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export function shortenAddress(address) {
  if (!address || typeof address !== "string") return "";
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function shortenHash(hash, prefix = 10, suffix = 8) {
  if (!hash || typeof hash !== "string") return "";
  if (hash.length <= prefix + suffix + 3) return hash;
  return `${hash.slice(0, prefix)}...${hash.slice(-suffix)}`;
}

export function computeRecordHash(payloadString) {
  return keccak256(toUtf8Bytes(String(payloadString ?? "")));
}

export function buildLedgerBlock({
  blockNumber,
  parentHash,
  eventType,
  actor,
  kwh,
  priceEth = 0,
  time,
}) {
  const payload = JSON.stringify({
    blockNumber,
    parentHash,
    eventType,
    actor,
    kwh,
    priceEth,
    time,
  });
  const txHash = computeRecordHash(payload);

  return {
    id: `blk-${blockNumber}-${txHash.slice(2, 10)}`,
    blockNumber,
    parentHash,
    txHash,
    eventType,
    actor,
    kwh,
    priceEth,
    time,
    payload,
    source: "keccak256-chain",
  };
}

export function verifyLedgerChain(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { valid: true, verifiedCount: 0, brokenBlockNumber: null };
  }

  const ascending = [...blocks].sort((a, b) => a.blockNumber - b.blockNumber);
  let verifiedCount = 0;

  for (let i = 0; i < ascending.length; i++) {
    const block = ascending[i];
    if (block.source === "keccak256-chain") {
      const expectedHash = computeRecordHash(block.payload);
      if (expectedHash !== block.txHash) {
        return {
          valid: false,
          verifiedCount,
          brokenBlockNumber: block.blockNumber,
        };
      }
      if (i > 0 && ascending[i - 1].blockNumber === block.blockNumber - 1) {
        if (block.parentHash !== ascending[i - 1].txHash) {
          return {
            valid: false,
            verifiedCount,
            brokenBlockNumber: block.blockNumber,
          };
        }
      }
    } else if (!/^0x[0-9a-fA-F]{64}$/.test(block.txHash || "")) {
      return {
        valid: false,
        verifiedCount,
        brokenBlockNumber: block.blockNumber,
      };
    }
    verifiedCount += 1;
  }

  return { valid: true, verifiedCount, brokenBlockNumber: null };
}

export function formatEth(value, maxDecimals = 4) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.0000";
  return num.toFixed(maxDecimals);
}

export function formatKwh(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

export function calculateOrderTotalEth(amountKwh, pricePerKwhEth) {
  const amount = Number(amountKwh);
  const price = Number(pricePerKwhEth);
  if (!Number.isFinite(amount) || !Number.isFinite(price) || amount <= 0 || price <= 0) {
    return 0;
  }
  return Number((amount * price).toFixed(6));
}

export function validateSellOrder({ connected, amountInput, priceInput, availableNrg }) {
  if (!connected) {
    return { valid: false, error: "Connect your wallet before listing power for sale." };
  }

  const trimmedAmount = String(amountInput ?? "").trim();
  const trimmedPrice = String(priceInput ?? "").trim();

  if (!trimmedAmount) {
    return { valid: false, error: "Enter the amount of energy in kWh." };
  }

  const amount = Number(trimmedAmount);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    return { valid: false, error: "Amount must be a whole positive number of kWh (e.g., 4)." };
  }

  if (amount > Number(availableNrg ?? 0)) {
    return {
      valid: false,
      error: `Insufficient NRG balance. You currently have ${formatKwh(availableNrg)} NRG available.`,
    };
  }

  if (!trimmedPrice) {
    return { valid: false, error: "Enter a price per kWh in ETH." };
  }

  const price = Number(trimmedPrice);
  if (!Number.isFinite(price) || price <= 0) {
    return { valid: false, error: "Price per kWh must be greater than 0 ETH." };
  }

  return {
    valid: true,
    error: "",
    amount,
    price,
  };
}

export function createInitialPreviewState(config) {
  const houseA = config?.houses?.houseA || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const houseB = config?.houses?.houseB || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const houseC = config?.houses?.houseC || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  const b1 = buildLedgerBlock({
    blockNumber: 1,
    parentHash: GENESIS_HASH,
    eventType: "EnergyListed",
    actor: houseB,
    kwh: 5,
    priceEth: 0.002,
    time: "10:12:05",
  });
  const b2 = buildLedgerBlock({
    blockNumber: 2,
    parentHash: b1.txHash,
    eventType: "EnergyPurchased",
    actor: houseB,
    kwh: 3,
    priceEth: 0.002,
    time: "10:15:40",
  });
  const b3 = buildLedgerBlock({
    blockNumber: 3,
    parentHash: b2.txHash,
    eventType: "EnergyListed",
    actor: houseC,
    kwh: 4,
    priceEth: 0.0018,
    time: "10:18:12",
  });
  const b4 = buildLedgerBlock({
    blockNumber: 4,
    parentHash: b3.txHash,
    eventType: "EnergyGenerated",
    actor: houseA,
    kwh: 4,
    priceEth: 0,
    time: "10:20:00",
  });

  return {
    houseA,
    houseB,
    houseC,
    ethBalance: 99.94,
    nrgBalance: 12,
    totalSolarGeneratedKwh: 26,
    totalTradesCompleted: 1,
    nextListingId: 2,
    ledgerBlocks: [b4, b3, b2, b1],
    listings: [
      {
        id: 0,
        seller: houseB,
        sellerLabel: "House B",
        amount: 5,
        pricePerKwh: 0.002,
        totalPrice: 0.01,
        active: true,
      },
      {
        id: 1,
        seller: houseC,
        sellerLabel: "House C",
        amount: 4,
        pricePerKwh: 0.0018,
        totalPrice: 0.0072,
        active: true,
      },
    ],
    solarSeries: [
      { time: "09:50", kwh: 3, house: "House A" },
      { time: "09:56", kwh: 5, house: "House A" },
      { time: "10:02", kwh: 4, house: "House A" },
      { time: "10:08", kwh: 6, house: "House A" },
      { time: "10:14", kwh: 4, house: "House A" },
      { time: "10:20", kwh: 4, house: "House A" },
    ],
    activities: [
      {
        id: "init-1",
        type: "Solar",
        message: "House A generated 4 kWh of solar energy",
        time: "10:20:00",
      },
      {
        id: "init-2",
        type: "Listed",
        message: `Neighbor ${shortenAddress(houseC)} listed 4 kWh at 0.0018 ETH/kWh`,
        time: "10:18:12",
      },
      {
        id: "init-3",
        type: "Purchased",
        message: `Neighbor ${shortenAddress(houseB)} bought 3 kWh from House A`,
        time: "10:15:40",
      },
      {
        id: "init-4",
        type: "Listed",
        message: `Neighbor ${shortenAddress(houseB)} listed 5 kWh at 0.0020 ETH/kWh`,
        time: "10:12:05",
      },
    ],
  };
}

function appendBlockToState(state, { eventType, actor, kwh, priceEth, time }) {
  const latest = state.ledgerBlocks?.[0];
  const nextNumber = latest ? latest.blockNumber + 1 : 1;
  const parentHash = latest ? latest.txHash : GENESIS_HASH;
  const nextBlock = buildLedgerBlock({
    blockNumber: nextNumber,
    parentHash,
    eventType,
    actor,
    kwh,
    priceEth,
    time,
  });
  return [nextBlock, ...(state.ledgerBlocks || [])].slice(0, 20);
}

export function applySolarGenerationTick(state, kwhAmount, prosumerAddress, timeLabel) {
  const safeKwh = Math.max(1, Math.round(Number(kwhAmount) || 0));
  const nextSeries = [
    ...state.solarSeries.slice(-11),
    { time: timeLabel, kwh: safeKwh, house: "House A" },
  ];
  const isUserHouseA =
    prosumerAddress &&
    state.houseA &&
    prosumerAddress.toLowerCase() === state.houseA.toLowerCase();

  const nextBlocks = appendBlockToState(state, {
    eventType: "EnergyGenerated",
    actor: prosumerAddress || state.houseA,
    kwh: safeKwh,
    priceEth: 0,
    time: timeLabel,
  });

  return {
    ...state,
    nrgBalance: isUserHouseA ? state.nrgBalance + safeKwh : state.nrgBalance,
    totalSolarGeneratedKwh: state.totalSolarGeneratedKwh + safeKwh,
    solarSeries: nextSeries,
    ledgerBlocks: nextBlocks,
    activities: [
      {
        id: `solar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "Solar",
        message: `House A generated ${safeKwh} kWh of solar energy`,
        time: timeLabel,
      },
      ...state.activities.slice(0, 19),
    ],
  };
}

export function applyCreateListing(state, sellerAddress, amountKwh, pricePerKwhEth, timeLabel) {
  const id = state.nextListingId;
  const totalPrice = calculateOrderTotalEth(amountKwh, pricePerKwhEth);
  const newListing = {
    id,
    seller: sellerAddress,
    sellerLabel: "Your House",
    amount: amountKwh,
    pricePerKwh: pricePerKwhEth,
    totalPrice,
    active: true,
  };

  const nextBlocks = appendBlockToState(state, {
    eventType: "EnergyListed",
    actor: sellerAddress,
    kwh: amountKwh,
    priceEth: pricePerKwhEth,
    time: timeLabel,
  });

  return {
    ...state,
    nrgBalance: Math.max(0, state.nrgBalance - amountKwh),
    nextListingId: id + 1,
    listings: [newListing, ...state.listings],
    ledgerBlocks: nextBlocks,
    activities: [
      {
        id: `list-${id}-${Date.now()}`,
        type: "Listed",
        message: `Neighbor ${shortenAddress(sellerAddress)} listed ${amountKwh} kWh at ${formatEth(pricePerKwhEth)} ETH/kWh`,
        time: timeLabel,
      },
      ...state.activities.slice(0, 19),
    ],
  };
}

export function applyBuyListing(state, listingId, buyerAddress, timeLabel) {
  const target = state.listings.find((item) => item.id === listingId && item.active);
  if (!target) {
    return { nextState: state, error: "This energy listing is no longer active." };
  }

  const totalPrice = calculateOrderTotalEth(target.amount, target.pricePerKwh);
  if (state.ethBalance < totalPrice) {
    return { nextState: state, error: "Insufficient ETH balance to complete this purchase." };
  }

  const isOwnListing =
    buyerAddress &&
    target.seller &&
    buyerAddress.toLowerCase() === target.seller.toLowerCase();

  const updatedEth = isOwnListing ? state.ethBalance : Number((state.ethBalance - totalPrice).toFixed(6));
  const updatedNrg = state.nrgBalance + target.amount;

  const nextBlocks = appendBlockToState(state, {
    eventType: "EnergyPurchased",
    actor: buyerAddress,
    kwh: target.amount,
    priceEth: totalPrice,
    time: timeLabel,
  });

  return {
    error: "",
    nextState: {
      ...state,
      ethBalance: updatedEth,
      nrgBalance: updatedNrg,
      totalTradesCompleted: state.totalTradesCompleted + 1,
      listings: state.listings.filter((item) => item.id !== listingId),
      ledgerBlocks: nextBlocks,
      activities: [
        {
          id: `buy-${listingId}-${Date.now()}`,
          type: "Purchased",
          message: `Neighbor ${shortenAddress(buyerAddress)} bought ${target.amount} kWh for ${formatEth(totalPrice)} ETH`,
          time: timeLabel,
        },
        ...state.activities.slice(0, 19),
      ],
    },
  };
}
