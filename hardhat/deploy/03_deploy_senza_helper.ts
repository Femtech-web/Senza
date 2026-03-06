import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("SenzaWalletHelper", {
    from: deployer,
    args: [],
    log: true,
  });
};

func.id = "deploy_senza_wallet_helper";
func.tags = ["SenzaWalletHelper"];

export default func;
