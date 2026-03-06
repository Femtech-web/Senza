export const NETWORKS = [
  {
    key: "hardhat",
    label: "Hardhat Local",
    shortLabel: "Hardhat",
    chainId: 31337,
    chainIdHex: "0x7a69",
    rpcUrl: "http://127.0.0.1:8545",
    config: {
      chainIdHex: "0x7a69",
      tokens: {
        USDC: {
          cToken: "0x9fE46736679d2d9a65F0992F2272dE9f3c7fa6e0",
          underlying: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        },
        USDT: {
          cToken: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
          underlying: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        },
      },
    },
  },
  {
    key: "sepolia",
    label: "Sepolia Testnet",
    shortLabel: "Sepolia",
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    config: {
      chainIdHex: "0xaa36a7",
      tokens: {
        USDC: {
          cToken: "0xbd7793f531643208Dc8117cd7Ed9a4c4B95311E1",
          underlying: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        },
        USDT: {
          cToken: "0xf51fE73BB97340401ae1815A96B3B5C7D501cfA0",
          underlying: "0x93C5d30a7509E60871B77A3548a5BD913334cd35",
        },
      },
    },
  },
  {
    key: "mainnet",
    label: "Ethereum Mainnet",
    shortLabel: "Mainnet",
    chainId: 1,
    chainIdHex: "0x1",
    rpcUrl: "https://ethereum.publicnode.com",
    config: {
      chainIdHex: "0x1",
      tokens: {
        USDC: {
          cToken: "",
          underlying: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
        USDT: {
          cToken: "",
          underlying: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        },
      },
    },
  },
] as const;

export type NetworkKey = (typeof NETWORKS)[number]["key"];

export const NETWORKS_BY_KEY: Record<NetworkKey, (typeof NETWORKS)[number]> =
  NETWORKS.reduce((acc, net) => {
    acc[net.key] = net;
    return acc;
  }, {} as Record<NetworkKey, (typeof NETWORKS)[number]>);

export const DEFAULT_CONFIG = NETWORKS_BY_KEY.sepolia.config;

export type SymbolKey = keyof typeof DEFAULT_CONFIG.tokens;

export type TokenConfig = {
  cToken: string;
  underlying: string;
};

export type AppConfig = {
  chainIdHex: string;
  tokens: Record<SymbolKey, TokenConfig>;
};

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
] as const;

export const C_TOKEN_ABI = [
  "function decimals() external view returns (uint8)",
  "function wrap(address to, uint256 amount) external",
  "function unwrap(address from, address to, bytes32 encryptedAmount, bytes inputProof) external",
  "function confidentialTransfer(address to, bytes32 encryptedAmount, bytes inputProof) external",
] as const;
