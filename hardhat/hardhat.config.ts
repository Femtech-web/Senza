import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-deploy";
import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import * as dotenv from "dotenv";

const MNEMONIC = vars.get(
  "MNEMONIC",
  "test test test test test test test test test test test junk"
);
const INFURA_API_KEY = vars.get("INFURA_API_KEY", "");
const SEPOLIA_PRIVATE_KEY = vars.get("SEPOLIA_PRIVATE_KEY", "");

const normalizePrivateKey = (value: string) => {
  if (!value) return "";
  return value.startsWith("0x") ? value : `0x${value}`;
};

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: { mnemonic: MNEMONIC },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: { mnemonic: MNEMONIC },
    },
    sepolia: {
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [`0x${process.env.SEPOLIA_PRIVATE_KEY}`]
        : [],
      chainId: 11155111,
      url: "https://ethereum-sepolia-rpc.publicnode.com",
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.27",
        settings: {
          optimizer: { enabled: true, runs: 800 },
          metadata: { bytecodeHash: "none" },
          evmVersion: "cancun",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
