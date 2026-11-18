export function shortenAddress(address) {
  if (!address || typeof address !== "string") return "";
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

  return {
    houseA,
    houseB,
    houseC,
    ethBalance: 99.94,
    nrgBalance: 12,
    totalSolarGeneratedKwh: 26,
    totalTradesCompleted: 1,
    nextListingId: 2,
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

  return {
    ...state,
    nrgBalance: isUserHouseA ? state.nrgBalance + safeKwh : state.nrgBalance,
    totalSolarGeneratedKwh: state.totalSolarGeneratedKwh + safeKwh,
    solarSeries: nextSeries,
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

  return {
    ...state,
    nrgBalance: Math.max(0, state.nrgBalance - amountKwh),
    nextListingId: id + 1,
    listings: [newListing, ...state.listings],
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

  return {
    error: "",
    nextState: {
      ...state,
      ethBalance: updatedEth,
      nrgBalance: updatedNrg,
      totalTradesCompleted: state.totalTradesCompleted + 1,
      listings: state.listings.filter((item) => item.id !== listingId),
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
