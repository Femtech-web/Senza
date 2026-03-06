import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const mockUSDC = await get("MockUSDC");
  const mockUSDT = await get("MockUSDT");

  await deploy("ConfidentialUSDC", {
    from: deployer,
    args: [mockUSDC.address],
    log: true,
  });

  await deploy("ConfidentialUSDT", {
    from: deployer,
    args: [mockUSDT.address],
    log: true,
  });
};

export default func;
func.id = "deploy_confidential_wrappers";
func.tags = ["Wrappers"];
func.dependencies = ["MockTokens"];

