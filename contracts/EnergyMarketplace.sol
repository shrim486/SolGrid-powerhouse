// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EnergyToken.sol";

/**
 * @title EnergyMarketplace
 * @notice Peer-to-peer microgrid marketplace for solar NRG tokens.
 */
contract EnergyMarketplace is ReentrancyGuard, Ownable {
    EnergyToken public immutable energyToken;

    struct Listing {
        uint256 id;
        address seller;
        uint256 amount; // Whole kWh amount
        uint256 pricePerKwh; // Wei per kWh
        bool active;
        uint256 createdAt;
    }

    Listing[] private listings;
    uint256 public totalSolarGeneratedKwh;
    uint256 public totalTradesCompleted;

    event EnergyGenerated(
        address indexed prosumer,
        uint256 kwhAmount,
        uint256 timestamp
    );
    event EnergyListed(
        uint256 indexed listingId,
        address indexed seller,
        uint256 amount,
        uint256 pricePerKwh,
        uint256 timestamp
    );
    event EnergyPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 totalPrice,
        uint256 timestamp
    );
    event ListingCancelled(uint256 indexed listingId, address indexed seller);

    constructor(address _energyToken) Ownable(msg.sender) {
        require(_energyToken != address(0), "Marketplace: invalid token address");
        energyToken = EnergyToken(_energyToken);
    }

    /**
     * @notice Records verified solar generation from an IoT smart meter and mints NRG tokens.
     * @param prosumer Address of the solar-generating household.
     * @param kwhAmount Whole kWh generated (e.g., 4 means 4 kWh = 4 NRG).
     */
    function recordSolarGeneration(
        address prosumer,
        uint256 kwhAmount
    ) external onlyOwner {
        require(prosumer != address(0), "Marketplace: invalid prosumer");
        require(kwhAmount > 0, "Marketplace: kwhAmount must be > 0");

        uint256 tokenAmount = kwhAmount * (10 ** energyToken.decimals());
        totalSolarGeneratedKwh += kwhAmount;
        energyToken.mint(prosumer, tokenAmount);

        emit EnergyGenerated(prosumer, kwhAmount, block.timestamp);
    }

    /**
     * @notice Lists NRG tokens for sale on the P2P microgrid marketplace.
     * @param amount Whole kWh amount to list.
     * @param pricePerKwh Price per kWh in wei.
     */
    function listEnergy(
        uint256 amount,
        uint256 pricePerKwh
    ) external nonReentrant returns (uint256) {
        require(amount > 0, "Marketplace: amount must be > 0");
        require(pricePerKwh > 0, "Marketplace: price must be > 0");

        uint256 tokenAmount = amount * (10 ** energyToken.decimals());
        require(
            energyToken.transferFrom(msg.sender, address(this), tokenAmount),
            "Marketplace: NRG transfer failed"
        );

        uint256 listingId = listings.length;
        listings.push(
            Listing({
                id: listingId,
                seller: msg.sender,
                amount: amount,
                pricePerKwh: pricePerKwh,
                active: true,
                createdAt: block.timestamp
            })
        );

        emit EnergyListed(
            listingId,
            msg.sender,
            amount,
            pricePerKwh,
            block.timestamp
        );
        return listingId;
    }

    /**
     * @notice Purchases an active P2P energy listing using ETH.
     * @param listingId ID of the active listing.
     */
    function buyEnergy(uint256 listingId) external payable nonReentrant {
        require(listingId < listings.length, "Marketplace: invalid listing ID");
        Listing storage listing = listings[listingId];
        require(listing.active, "Marketplace: listing is no longer active");

        uint256 totalPrice = listing.amount * listing.pricePerKwh;
        require(msg.value >= totalPrice, "Marketplace: insufficient ETH sent");

        listing.active = false;
        totalTradesCompleted += 1;

        uint256 tokenAmount = listing.amount * (10 ** energyToken.decimals());

        (bool sentToSeller, ) = payable(listing.seller).call{value: totalPrice}("");
        require(sentToSeller, "Marketplace: ETH transfer to seller failed");

        uint256 excess = msg.value - totalPrice;
        if (excess > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: excess}("");
            require(refunded, "Marketplace: excess ETH refund failed");
        }

        require(
            energyToken.transfer(msg.sender, tokenAmount),
            "Marketplace: NRG delivery failed"
        );

        emit EnergyPurchased(
            listingId,
            msg.sender,
            listing.seller,
            listing.amount,
            totalPrice,
            block.timestamp
        );
    }

    /**
     * @notice Allows a seller to cancel their active listing and reclaim NRG tokens.
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        require(listingId < listings.length, "Marketplace: invalid listing ID");
        Listing storage listing = listings[listingId];
        require(listing.active, "Marketplace: listing not active");
        require(listing.seller == msg.sender, "Marketplace: not listing seller");

        listing.active = false;
        uint256 tokenAmount = listing.amount * (10 ** energyToken.decimals());
        require(
            energyToken.transfer(msg.sender, tokenAmount),
            "Marketplace: NRG refund failed"
        );

        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @notice Returns all currently active P2P sell orders.
     */
    function getActiveListings() external view returns (Listing[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < listings.length; i++) {
            if (listings[i].active) {
                activeCount++;
            }
        }

        Listing[] memory activeListings = new Listing[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < listings.length; i++) {
            if (listings[i].active) {
                activeListings[idx] = listings[i];
                idx++;
            }
        }
        return activeListings;
    }

    function getListingCount() external view returns (uint256) {
        return listings.length;
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        require(listingId < listings.length, "Marketplace: invalid listing ID");
        return listings[listingId];
    }
}
