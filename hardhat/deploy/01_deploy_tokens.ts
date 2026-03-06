import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("MockUSDC", {
    contract: "MockERC20",
    from: deployer,
    args: ["USD Coin", "USDC", hre.ethers.parseUnits("1000000", 6), 6, deployer],
    log: true,
  });

  await deploy("MockUSDT", {
    contract: "MockERC20",
    from: deployer,
    args: ["Tether USD", "USDT", hre.ethers.parseUnits("1000000", 6), 6, deployer],
    log: true,
  });
};

export default func;
func.id = "deploy_mock_tokens";
func.tags = ["MockTokens"];

