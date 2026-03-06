import fs from "fs";
import path from "path";
import hre from "hardhat";

async function main() {
  const deploymentsApi = (hre as any).deployments;
  if (!deploymentsApi || typeof deploymentsApi.getOrNull !== "function") {
    throw new Error(
      "hardhat-deploy runtime not available. Run this script with Hardhat (npm run export:deployments)."
    );
  }
  const getOrNull = deploymentsApi.getOrNull.bind(deploymentsApi);
  const mockUSDC = await getOrNull("MockUSDC");
  const mockUSDT = await getOrNull("MockUSDT");
  const cUSDC = await getOrNull("ConfidentialUSDC");
  const cUSDT = await getOrNull("ConfidentialUSDT");
  const cUSDCOfficial = await getOrNull("ConfidentialUSDC_Official");
  const cUSDTOfficial = await getOrNull("ConfidentialUSDT_Official");
  const helper = await getOrNull("SenzaWalletHelper");

  const payload = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    updatedAt: new Date().toISOString(),
    contracts: {
      mockTokens: {
        USDC: mockUSDC?.address ?? null,
        USDT: mockUSDT?.address ?? null,
      },
      confidentialTokens: {
        cUSDC: cUSDC?.address ?? null,
        cUSDT: cUSDT?.address ?? null,
      },
      officialTokens: {
        USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        USDT: "0x93C5d30a7509E60871B77A3548a5BD913334cd35",
      },
      confidentialTokensOfficial: {
        cUSDC: cUSDCOfficial?.address ?? null,
        cUSDT: cUSDTOfficial?.address ?? null,
      },
      helper: helper?.address ?? null,
    },
  };

  const output = path.join(process.cwd(), "deployments.json");
  fs.writeFileSync(output, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${output}`);

  const networkOutput = path.join(process.cwd(), `deployments.${hre.network.name}.json`);
  fs.writeFileSync(networkOutput, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${networkOutput}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
