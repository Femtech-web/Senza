import ConfidentialUSDCJson from "./contract_abis/ConfidentialUSDC.json";
import ConfidentialUSDTJson from "./contract_abis/ConfidentialUSDT.json";

export const ABIS = {
  ERC20: [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function decimals() external view returns (uint8)",
    "function balanceOf(address account) external view returns (uint256)",
  ] as const,
  ConfidentialUSDC: ConfidentialUSDCJson.abi,
  ConfidentialUSDT: ConfidentialUSDTJson.abi,
} as const;
