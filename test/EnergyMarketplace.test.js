const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SolGrid Microgrid Contracts", function () {
  async function deployFixture() {
    const [houseA, houseB, houseC] = await ethers.getSigners();
    const EnergyToken = await ethers.getContractFactory("EnergyToken");
    const energyToken = await EnergyToken.deploy();
    await energyToken.waitForDeployment();

    const EnergyMarketplace = await ethers.getContractFactory("EnergyMarketplace");
    const marketplace = await EnergyMarketplace.deploy(await energyToken.getAddress());
    await marketplace.waitForDeployment();

    await energyToken.setMarketplace(await marketplace.getAddress());

    return { energyToken, marketplace, houseA, houseB, houseC };
  }

  it("mints NRG tokens when solar generation is recorded", async function () {
    const { energyToken, marketplace, houseA } = await deployFixture();

    await expect(marketplace.recordSolarGeneration(houseA.address, 5))
      .to.emit(marketplace, "EnergyGenerated")
      .withArgs(houseA.address, 5, (val) => val > 0);

    const balance = await energyToken.balanceOf(houseA.address);
    expect(balance).to.equal(ethers.parseUnits("5", 18));
    expect(await marketplace.totalSolarGeneratedKwh()).to.equal(5n);
  });

  it("allows listing NRG and purchasing with ETH", async function () {
    const { energyToken, marketplace, houseA, houseB } = await deployFixture();

    await marketplace.recordSolarGeneration(houseA.address, 10);

    const pricePerKwh = ethers.parseEther("0.002");
    await energyToken.connect(houseA).approve(await marketplace.getAddress(), ethers.parseUnits("4", 18));

    await expect(marketplace.connect(houseA).listEnergy(4, pricePerKwh))
      .to.emit(marketplace, "EnergyListed");

    const activeBefore = await marketplace.getActiveListings();
    expect(activeBefore.length).to.equal(1);
    expect(activeBefore[0].amount).to.equal(4n);

    const totalCost = pricePerKwh * 4n;
    const sellerEthBefore = await ethers.provider.getBalance(houseA.address);

    await expect(
      marketplace.connect(houseB).buyEnergy(0, { value: totalCost })
    ).to.emit(marketplace, "EnergyPurchased");

    const sellerEthAfter = await ethers.provider.getBalance(houseA.address);
    expect(sellerEthAfter - sellerEthBefore).to.equal(totalCost);
    expect(await energyToken.balanceOf(houseB.address)).to.equal(ethers.parseUnits("4", 18));
    expect(await marketplace.totalTradesCompleted()).to.equal(1n);

    const activeAfter = await marketplace.getActiveListings();
    expect(activeAfter.length).to.equal(0);
  });
});
