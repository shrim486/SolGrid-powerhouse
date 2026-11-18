import argparse
import json
import os
import random
import sys
import time
from datetime import datetime
from web3 import Web3


def load_config():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "config.json")
    if not os.path.exists(config_path):
        raise FileNotFoundError(
            f"Missing {config_path}. Run `npx hardhat run scripts/deploy.js --network localhost` first."
        )
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="SolGrid Neighborhood IoT Smart Meter Simulator")
    parser.add_argument("--once", action="store_true", help="Run a single simulation tick and exit")
    args = parser.parse_args()

    config = load_config()
    rpc_url = config.get("rpcUrl", "http://127.0.0.1:8545")
    w3 = Web3(Web3.HTTPProvider(rpc_url))

    if not w3.is_connected():
        print(f"[ERROR] Could not connect to Ethereum RPC at {rpc_url}")
        print("Start Hardhat node first: npx hardhat node")
        sys.exit(1)

    marketplace_addr = Web3.to_checksum_address(config["energyMarketplace"]["address"])
    marketplace_abi = config["energyMarketplace"]["abi"]
    marketplace = w3.eth.contract(address=marketplace_addr, abi=marketplace_abi)

    accounts = w3.eth.accounts
    if len(accounts) < 3:
        print("[ERROR] Expected at least 3 Hardhat accounts on the local node.")
        sys.exit(1)

    houses = config.get("houses", {})
    house_a = Web3.to_checksum_address(houses.get("houseA", accounts[0]))
    house_b = Web3.to_checksum_address(houses.get("houseB", accounts[1]))
    house_c = Web3.to_checksum_address(houses.get("houseC", accounts[2]))
    deployer = accounts[0]

    print("=" * 68)
    print("SolGrid IoT Smart Meter Simulator")
    print(f"Connected to {rpc_url} (Chain ID: {w3.eth.chain_id})")
    print(f"Marketplace Contract : {marketplace_addr}")
    print(f"House A (Prosumer)   : {house_a}")
    print(f"House B (Consumer)   : {house_b}")
    print(f"House C (Balanced)   : {house_c}")
    print("=" * 68)

    cycle = 0
    try:
        while True:
            cycle += 1
            timestamp = datetime.now().strftime("%H:%M:%S")
            solar_kwh = random.randint(3, 6)
            house_b_demand = random.randint(2, 5)
            house_c_solar = random.randint(2, 4)

            print(f"\n[Cycle #{cycle} | {timestamp}] Reading neighborhood smart meters...")

            # House A: Solar Prosumer -> mint NRG tokens on-chain
            tx_hash = marketplace.functions.recordSolarGeneration(
                house_a, solar_kwh
            ).transact({"from": deployer})
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
            tx_hex = receipt.transactionHash.hex()

            print(
                f"  House A (Solar Prosumer) : +{solar_kwh} kWh generated -> "
                f"Minted {solar_kwh} NRG | Tx: {tx_hex}"
            )
            print(
                f"  House B (Consumer)       : -{house_b_demand} kWh grid demand "
                f"(Needs {house_b_demand} NRG from peers)"
            )
            print(
                f"  House C (Balanced)       :  0 kWh net exchange "
                f"({house_c_solar} kWh solar == {house_c_solar} kWh load)"
            )

            if args.once:
                break

            time.sleep(6)
    except KeyboardInterrupt:
        print("\nSmart meter simulator stopped.")


if __name__ == "__main__":
    main()
