const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, houseB, houseC] = await hre.ethers.getSigners();

  console.log("Deploying SolGrid contracts with account:", deployer.address);

  // 1. Deploy EnergyToken
  const EnergyToken = await hre.ethers.getContractFactory("EnergyToken");
  const energyToken = await EnergyToken.deploy();
  await energyToken.waitForDeployment();
  const energyTokenAddress = await energyToken.getAddress();
  console.log("EnergyToken (NRG) deployed to:", energyTokenAddress);

  // 2. Deploy EnergyMarketplace
  const EnergyMarketplace = await hre.ethers.getContractFactory("EnergyMarketplace");
  const marketplace = await EnergyMarketplace.deploy(energyTokenAddress);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("EnergyMarketplace deployed to:", marketplaceAddress);

  // 3. Link EnergyToken -> EnergyMarketplace
  const linkTx = await energyToken.setMarketplace(marketplaceAddress);
  await linkTx.wait();
  console.log("Linked EnergyToken minting permission to EnergyMarketplace");

  // 4. Seed initial microgrid activity so dashboard has immediate live orders
  const genTx1 = await marketplace.recordSolarGeneration(deployer.address, 12);
  await genTx1.wait();
  const genTx2 = await marketplace.recordSolarGeneration(houseB.address, 8);
  await genTx2.wait();
  const genTx3 = await marketplace.recordSolarGeneration(houseC.address, 6);
  await genTx3.wait();

  // Approve & create two starter neighbor sell orders
  const tokenAsHouseB = energyToken.connect(houseB);
  const marketAsHouseB = marketplace.connect(houseB);
  await (await tokenAsHouseB.approve(marketplaceAddress, hre.ethers.parseUnits("5", 18))).wait();
  await (await marketAsHouseB.listEnergy(5, hre.ethers.parseEther("0.002"))).wait();

  const tokenAsHouseC = energyToken.connect(houseC);
  const marketAsHouseC = marketplace.connect(houseC);
  await (await tokenAsHouseC.approve(marketplaceAddress, hre.ethers.parseUnits("4", 18))).wait();
  await (await marketAsHouseC.listEnergy(4, hre.ethers.parseEther("0.0018"))).wait();

  console.log("Seeded initial solar generation & 2 neighbor P2P energy listings.");

  // 5. Read ABIs and export config to frontend and simulator
  const tokenArtifact = await hre.artifacts.readArtifact("EnergyToken");
  const marketplaceArtifact = await hre.artifacts.readArtifact("EnergyMarketplace");

  const config = {
    network: hre.network.name,
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
    deployedAt: new Date().toISOString(),
    houses: {
      houseA: deployer.address,
      houseB: houseB.address,
      houseC: houseC.address,
    },
    energyToken: {
      address: energyTokenAddress,
      abi: tokenArtifact.abi,
    },
    energyMarketplace: {
      address: marketplaceAddress,
      abi: marketplaceArtifact.abi,
    },
  };

  const frontendConfigPath = path.join(__dirname, "..", "frontend", "src", "contractConfig.json");
  const simulatorConfigPath = path.join(__dirname, "..", "simulator", "config.json");

  fs.mkdirSync(path.dirname(frontendConfigPath), { recursive: true });
  fs.mkdirSync(path.dirname(simulatorConfigPath), { recursive: true });

  fs.writeFileSync(frontendConfigPath, JSON.stringify(config, null, 2));
  fs.writeFileSync(simulatorConfigPath, JSON.stringify(config, null, 2));

  console.log("Exported contractConfig.json ->", frontendConfigPath);
  console.log("Exported simulator config.json ->", simulatorConfigPath);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
