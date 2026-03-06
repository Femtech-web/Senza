import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const SEPOLIA_USDT = "0x93C5d30a7509E60871B77A3548a5BD913334cd35";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (hre.network.name !== "sepolia") {
    return;
  }

  const { deployer } = await hre.getNamedAccounts();
  if (!deployer) {
    throw new Error(
      "Missing deployer account. Set SEPOLIA_PRIVATE_KEY (preferred) or MNEMONIC in hardhat config."
    );
  }
  const { deploy } = hre.deployments;

  await deploy("ConfidentialUSDC_Official", {
    contract: "ConfidentialUSDC",
    from: deployer,
    args: [SEPOLIA_USDC],
    log: true,
  });

  await deploy("ConfidentialUSDT_Official", {
    contract: "ConfidentialUSDT",
    from: deployer,
    args: [SEPOLIA_USDT],
    log: true,
  });
};

export default func;
func.id = "deploy_confidential_wrappers_sepolia";
func.tags = ["WrappersSepolia"];
