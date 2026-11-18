import React, { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import contractConfig from "./contractConfig.json";
import TopBar from "./components/TopBar.jsx";
import MicrogridHero from "./components/MicrogridHero.jsx";
import SummaryCards from "./components/SummaryCards.jsx";
import SolarChart from "./components/SolarChart.jsx";
import TradingPanels from "./components/TradingPanels.jsx";
import ActivityLog from "./components/ActivityLog.jsx";
import BlockchainProof from "./components/BlockchainProof.jsx";
import {
  GENESIS_HASH,
  applyBuyListing,
  applyCreateListing,
  applySolarGenerationTick,
  createInitialPreviewState,
  formatEth,
  shortenAddress,
} from "./utils/gridLogic.js";

function nowTimeLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function shortTimeLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getHouseLabel(address) {
  if (!address || !contractConfig?.houses) return "";
  const lower = address.toLowerCase();
  if (lower === contractConfig.houses.houseA?.toLowerCase()) return "House A";
  if (lower === contractConfig.houses.houseB?.toLowerCase()) return "House B";
  if (lower === contractConfig.houses.houseC?.toLowerCase()) return "House C";
  return "";
}

export default function App() {
  const [chainOnline, setChainOnline] = useState(false);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [selectedHouseId, setSelectedHouseId] = useState("houseA");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);
  const [buyingListingId, setBuyingListingId] = useState(null);
  const [notice, setNotice] = useState(null);

  const [gridState, setGridState] = useState(() =>
    createInitialPreviewState(contractConfig)
  );

  const rpcProviderRef = useRef(null);
  const signerRef = useRef(null);

  const loadOnChainData = useCallback(async (provider, activeAccount) => {
    try {
      const market = new ethers.Contract(
        contractConfig.energyMarketplace.address,
        contractConfig.energyMarketplace.abi,
        provider
      );
      const token = new ethers.Contract(
        contractConfig.energyToken.address,
        contractConfig.energyToken.abi,
        provider
      );

      const [totalSolar, totalTrades, rawListings, genEvents, listEvents, buyEvents] =
        await Promise.all([
          market.totalSolarGeneratedKwh(),
          market.totalTradesCompleted(),
          market.getActiveListings(),
          market.queryFilter(market.filters.EnergyGenerated(), 0, "latest"),
          market.queryFilter(market.filters.EnergyListed(), 0, "latest"),
          market.queryFilter(market.filters.EnergyPurchased(), 0, "latest"),
        ]);

      let nextEthBalance = 0;
      let nextNrgBalance = 0;
      if (activeAccount) {
        const [ethWei, nrgWei] = await Promise.all([
          provider.getBalance(activeAccount),
          token.balanceOf(activeAccount),
        ]);
        nextEthBalance = Number(ethers.formatEther(ethWei));
        nextNrgBalance = Number(ethers.formatUnits(nrgWei, 18));
      }

      const formattedListings = rawListings.map((item) => {
        const amountNum = Number(item.amount);
        const priceEth = Number(ethers.formatEther(item.pricePerKwh));
        return {
          id: Number(item.id),
          seller: item.seller,
          sellerLabel: getHouseLabel(item.seller),
          amount: amountNum,
          pricePerKwh: priceEth,
          totalPrice: Number((amountNum * priceEth).toFixed(6)),
          active: item.active,
        };
      });

      const solarPoints = genEvents.slice(-12).map((ev) => {
        const ts = Number(ev.args.timestamp) * 1000;
        const label = new Date(ts).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        return {
          time: label,
          kwh: Number(ev.args.kwhAmount),
          house: getHouseLabel(ev.args.prosumer) || "House A",
        };
      });

      const combinedEvents = [
        ...genEvents.map((ev) => ({
          blockNumber: ev.blockNumber,
          logIndex: ev.index,
          txHash: ev.transactionHash,
          eventType: "EnergyGenerated",
          actor: ev.args.prosumer,
          kwh: Number(ev.args.kwhAmount),
          priceEth: 0,
          id: `gen-${ev.transactionHash}-${ev.index}`,
          type: "Solar",
          message: `${getHouseLabel(ev.args.prosumer) || shortenAddress(ev.args.prosumer)} generated ${Number(ev.args.kwhAmount)} kWh of solar energy`,
          time: new Date(Number(ev.args.timestamp) * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
        })),
        ...listEvents.map((ev) => ({
          blockNumber: ev.blockNumber,
          logIndex: ev.index,
          txHash: ev.transactionHash,
          eventType: "EnergyListed",
          actor: ev.args.seller,
          kwh: Number(ev.args.amount),
          priceEth: Number(ethers.formatEther(ev.args.pricePerKwh)),
          id: `list-${ev.transactionHash}-${ev.index}`,
          type: "Listed",
          message: `Neighbor ${shortenAddress(ev.args.seller)} listed ${Number(ev.args.amount)} kWh at ${formatEth(ethers.formatEther(ev.args.pricePerKwh))} ETH/kWh`,
          time: new Date(Number(ev.args.timestamp) * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
        })),
        ...buyEvents.map((ev) => ({
          blockNumber: ev.blockNumber,
          logIndex: ev.index,
          txHash: ev.transactionHash,
          eventType: "EnergyPurchased",
          actor: ev.args.buyer,
          kwh: Number(ev.args.amount),
          priceEth: Number(ethers.formatEther(ev.args.totalPrice)),
          id: `buy-${ev.transactionHash}-${ev.index}`,
          type: "Purchased",
          message: `Neighbor ${shortenAddress(ev.args.buyer)} bought ${Number(ev.args.amount)} kWh for ${formatEth(ethers.formatEther(ev.args.totalPrice))} ETH`,
          time: new Date(Number(ev.args.timestamp) * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
        })),
      ]
        .sort((a, b) =>
          b.blockNumber !== a.blockNumber
            ? b.blockNumber - a.blockNumber
            : b.logIndex - a.logIndex
        )
        .slice(0, 20);

      const uniqueBlockNums = [...new Set(combinedEvents.slice(0, 8).map((e) => e.blockNumber))];
      const blockMetaMap = {};
      await Promise.all(
        uniqueBlockNums.map(async (num) => {
          const blk = await provider.getBlock(num);
          if (blk) blockMetaMap[num] = blk.parentHash;
        })
      );

      const onChainBlocks = combinedEvents.slice(0, 8).map((ev) => ({
        id: `rpc-${ev.id}`,
        blockNumber: ev.blockNumber,
        txHash: ev.txHash,
        parentHash: blockMetaMap[ev.blockNumber] || GENESIS_HASH,
        eventType: ev.eventType,
        actor: ev.actor,
        kwh: ev.kwh,
        priceEth: ev.priceEth,
        time: ev.time,
        payload: JSON.stringify({
          blockNumber: ev.blockNumber,
          txHash: ev.txHash,
          eventType: ev.eventType,
          actor: ev.actor,
          kwh: ev.kwh,
        }),
        source: "ethereum-rpc",
      }));

      setGridState((prev) => ({
        ...prev,
        ethBalance: activeAccount ? nextEthBalance : prev.ethBalance,
        nrgBalance: activeAccount ? nextNrgBalance : prev.nrgBalance,
        totalSolarGeneratedKwh: Number(totalSolar),
        totalTradesCompleted: Number(totalTrades),
        listings: formattedListings,
        solarSeries: solarPoints,
        activities: combinedEvents,
        ledgerBlocks: onChainBlocks,
      }));
    } catch (err) {
      console.error("Failed to sync on-chain state:", err);
    }
  }, []);

  // Probe local Hardhat RPC on startup with fetch first so ethers.JsonRpcProvider never loops retries
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function detectLocalNode() {
      if (!contractConfig?.energyMarketplace?.address) return;
      const rpcUrl = contractConfig.rpcUrl || "http://127.0.0.1:8545";
      const timeoutId = setTimeout(() => controller.abort(), 700);

      try {
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_chainId",
            params: [],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) return;

        const provider = new ethers.JsonRpcProvider(rpcUrl, contractConfig.chainId, {
          staticNetwork: true,
        });
        const code = await provider.getCode(contractConfig.energyMarketplace.address);
        if (!cancelled && code && code !== "0x") {
          rpcProviderRef.current = provider;
          setChainOnline(true);
          await loadOnChainData(provider, "");
        } else {
          provider.destroy();
        }
      } catch {
        clearTimeout(timeoutId);
        if (!cancelled) {
          setChainOnline(false);
        }
      }
    }

    detectLocalNode();
    return () => {
      cancelled = true;
      controller.abort();
      if (rpcProviderRef.current) {
        rpcProviderRef.current.destroy();
        rpcProviderRef.current = null;
      }
    };
  }, [loadOnChainData]);

  // Poll Hardhat node every 4s when on-chain, OR simulate House A solar ticks every 6s in preview mode
  useEffect(() => {
    if (chainOnline && rpcProviderRef.current) {
      const interval = setInterval(() => {
        loadOnChainData(rpcProviderRef.current, account);
      }, 4000);
      return () => clearInterval(interval);
    }

    const previewInterval = setInterval(() => {
      const kwh = Math.floor(Math.random() * 4) + 3; // 3-6 kWh
      setGridState((prev) =>
        applySolarGenerationTick(prev, kwh, prev.houseA, shortTimeLabel())
      );
    }, 6000);

    return () => clearInterval(previewInterval);
  }, [chainOnline, account, loadOnChainData]);

  function handleTriggerSolarPulse() {
    const kwh = Math.floor(Math.random() * 4) + 3;
    setGridState((prev) =>
      applySolarGenerationTick(prev, kwh, prev.houseA, shortTimeLabel())
    );
    setNotice({
      type: "success",
      text: `House A smart meter recorded +${kwh} kWh solar generation and minted ${kwh} NRG.`,
    });
  }

  async function handleConnectWallet() {
    setIsConnecting(true);
    setNotice(null);

    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        await browserProvider.send("eth_requestAccounts", []);

        if (chainOnline) {
          const network = await browserProvider.getNetwork();
          if (Number(network.chainId) !== contractConfig.chainId) {
            try {
              await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: "0x7a69" }],
              });
            } catch (switchErr) {
              if (switchErr.code === 4902) {
                await window.ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: "0x7a69",
                      chainName: "Hardhat Localhost",
                      rpcUrls: [contractConfig.rpcUrl || "http://127.0.0.1:8545"],
                      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                    },
                  ],
                });
              }
            }
          }
        }

        const signer = await browserProvider.getSigner();
        const addr = await signer.getAddress();
        signerRef.current = signer;
        setAccount(addr);
        setConnected(true);

        if (chainOnline && rpcProviderRef.current) {
          await loadOnChainData(rpcProviderRef.current, addr);
          setNotice({
            type: "success",
            text: `MetaMask connected (${shortenAddress(addr)}) on Hardhat Localhost.`,
          });
        } else {
          setNotice({
            type: "success",
            text: `MetaMask connected (${shortenAddress(addr)}). Running in interactive microgrid preview until localhost:8545 is active.`,
          });
        }
        return;
      }

      if (chainOnline && rpcProviderRef.current) {
        const localSigner = await rpcProviderRef.current.getSigner(0);
        const addr = await localSigner.getAddress();
        signerRef.current = localSigner;
        setAccount(addr);
        setConnected(true);
        await loadOnChainData(rpcProviderRef.current, addr);
        setNotice({
          type: "success",
          text: `Connected to local Hardhat account ${shortenAddress(addr)}.`,
        });
      } else {
        const demoAddress =
          contractConfig?.houses?.houseA ||
          "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        setAccount(demoAddress);
        setConnected(true);
        setNotice({
          type: "success",
          text: `Connected House A wallet (${shortenAddress(demoAddress)}) in interactive grid mode.`,
        });
      }
    } catch (err) {
      setNotice({
        type: "error",
        text: err?.message || "Wallet connection was cancelled.",
      });
    } finally {
      setIsConnecting(false);
    }
  }

  function handleDisconnectWallet() {
    signerRef.current = null;
    setConnected(false);
    setAccount("");
    setNotice(null);
  }

  async function handleListEnergy(amountKwh, pricePerKwhEth) {
    if (!connected) {
      const msg = "Connect your wallet first to list energy for sale.";
      setNotice({ type: "error", text: msg });
      return { error: msg };
    }

    setIsSubmittingSell(true);
    setNotice(null);

    try {
      if (chainOnline && signerRef.current) {
        const tokenWithSigner = new ethers.Contract(
          contractConfig.energyToken.address,
          contractConfig.energyToken.abi,
          signerRef.current
        );
        const marketWithSigner = new ethers.Contract(
          contractConfig.energyMarketplace.address,
          contractConfig.energyMarketplace.abi,
          signerRef.current
        );

        const tokenAmount = ethers.parseUnits(String(amountKwh), 18);
        const priceWei = ethers.parseEther(String(pricePerKwhEth));

        const approveTx = await tokenWithSigner.approve(
          contractConfig.energyMarketplace.address,
          tokenAmount
        );
        await approveTx.wait();

        const listTx = await marketWithSigner.listEnergy(amountKwh, priceWei);
        await listTx.wait();

        await loadOnChainData(rpcProviderRef.current, account);
        setNotice({
          type: "success",
          text: `Listed ${amountKwh} kWh at ${formatEth(pricePerKwhEth)} ETH/kWh on-chain.`,
        });
        return { error: "" };
      }

      setGridState((prev) =>
        applyCreateListing(prev, account, amountKwh, pricePerKwhEth, nowTimeLabel())
      );
      setNotice({
        type: "success",
        text: `Listed ${amountKwh} kWh at ${formatEth(pricePerKwhEth)} ETH/kWh.`,
      });
      return { error: "" };
    } catch (err) {
      const msg = err?.shortMessage || err?.message || "Failed to create sell order.";
      setNotice({ type: "error", text: msg });
      return { error: msg };
    } finally {
      setIsSubmittingSell(false);
    }
  }

  async function handleBuyEnergy(listing) {
    if (!connected) {
      setNotice({
        type: "error",
        text: "Click Connect MetaMask in the top bar before buying energy.",
      });
      return;
    }

    setBuyingListingId(listing.id);
    setNotice(null);

    try {
      if (chainOnline && signerRef.current) {
        const marketWithSigner = new ethers.Contract(
          contractConfig.energyMarketplace.address,
          contractConfig.energyMarketplace.abi,
          signerRef.current
        );
        const pricePerKwhWei = ethers.parseEther(String(listing.pricePerKwh));
        const totalWei = pricePerKwhWei * BigInt(listing.amount);

        const buyTx = await marketWithSigner.buyEnergy(listing.id, {
          value: totalWei,
        });
        await buyTx.wait();

        await loadOnChainData(rpcProviderRef.current, account);
        setNotice({
          type: "success",
          text: `Purchased ${listing.amount} kWh from ${shortenAddress(listing.seller)}.`,
        });
        return;
      }

      const { nextState, error } = applyBuyListing(
        gridState,
        listing.id,
        account,
        nowTimeLabel()
      );
      if (error) {
        setNotice({ type: "error", text: error });
        return;
      }
      setGridState(nextState);
      setNotice({
        type: "success",
        text: `Purchased ${listing.amount} kWh for ${formatEth(listing.totalPrice)} ETH.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err?.shortMessage || err?.message || "Purchase transaction failed.",
      });
    } finally {
      setBuyingListingId(null);
    }
  }

  const latestSolarKwh =
    gridState.solarSeries.length > 0
      ? gridState.solarSeries[gridState.solarSeries.length - 1].kwh
      : 4;

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.08),_transparent_55%)] text-slate-100">
      <TopBar
        connected={connected}
        account={account}
        ethBalance={gridState.ethBalance}
        nrgBalance={gridState.nrgBalance}
        modeLabel={chainOnline ? "Hardhat Localhost" : "Interactive Preview"}
        isConnecting={isConnecting}
        onConnect={handleConnectWallet}
        onDisconnect={handleDisconnectWallet}
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <MicrogridHero
          houses={{
            houseA: gridState.houseA,
            houseB: gridState.houseB,
            houseC: gridState.houseC,
          }}
          selectedHouseId={selectedHouseId}
          onSelectHouse={setSelectedHouseId}
          latestSolarKwh={latestSolarKwh}
          chainOnline={chainOnline}
          connected={connected}
          onConnect={handleConnectWallet}
          onTriggerSolarPulse={handleTriggerSolarPulse}
        />

        {notice && (
          <div
            role={notice.type === "error" ? "alert" : "status"}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              notice.type === "error"
                ? "border-red-500/40 bg-red-950/60 text-red-200"
                : "border-emerald-500/40 bg-emerald-950/60 text-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notice.type === "error" ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              )}
              <span>{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-medium underline underline-offset-2 opacity-80 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <SummaryCards
          totalSolarGeneratedKwh={gridState.totalSolarGeneratedKwh}
          activeSellOrdersCount={gridState.listings.length}
          totalTradesCompleted={gridState.totalTradesCompleted}
        />

        <SolarChart
          solarSeries={gridState.solarSeries}
          isLiveTicking={!chainOnline}
        />

        <TradingPanels
          connected={connected}
          nrgBalance={gridState.nrgBalance}
          listings={gridState.listings}
          selectedHouseId={selectedHouseId}
          houses={{
            houseA: gridState.houseA,
            houseB: gridState.houseB,
            houseC: gridState.houseC,
          }}
          isSubmittingSell={isSubmittingSell}
          buyingListingId={buyingListingId}
          onListEnergy={handleListEnergy}
          onBuyEnergy={handleBuyEnergy}
        />

        <ActivityLog activities={gridState.activities} />

        <BlockchainProof
          ledgerBlocks={gridState.ledgerBlocks}
          contractConfig={contractConfig}
          chainOnline={chainOnline}
        />
      </main>
    </div>
  );
}
