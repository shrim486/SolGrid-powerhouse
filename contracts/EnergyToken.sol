// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EnergyToken
 * @notice ERC-20 token representing tokenized solar microgrid energy (1 NRG = 1 kWh).
 */
contract EnergyToken is ERC20, Ownable {
    address public marketplace;

    event MarketplaceUpdated(address indexed newMarketplace);

    modifier onlyMarketplaceOrOwner() {
        require(
            msg.sender == owner() || msg.sender == marketplace,
            "EnergyToken: caller is not owner or marketplace"
        );
        _;
    }

    constructor() ERC20("Microgrid Energy Token", "NRG") Ownable(msg.sender) {}

    /**
     * @notice Links the EnergyMarketplace contract so it can mint NRG on solar generation.
     */
    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "EnergyToken: invalid marketplace address");
        marketplace = _marketplace;
        emit MarketplaceUpdated(_marketplace);
    }

    /**
     * @notice Mints NRG tokens (18 decimals, 1e18 = 1 kWh).
     */
    function mint(address to, uint256 amount) external onlyMarketplaceOrOwner {
        require(to != address(0), "EnergyToken: mint to zero address");
        _mint(to, amount);
    }
}
