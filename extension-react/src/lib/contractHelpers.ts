import { ethers } from "ethers";
import { ABIS } from "../abis";

export const buildErc20 = (address: string, signerOrProvider: ethers.Signer | ethers.Provider) =>
  new ethers.Contract(address, ABIS.ERC20, signerOrProvider);

export const buildCToken = (address: string, signerOrProvider: ethers.Signer | ethers.Provider) =>
  new ethers.Contract(address, ABIS.ConfidentialUSDC, signerOrProvider);

export async function estimateGasByData(
  provider: ethers.Provider,
  from: string,
  to: string,
  data: string
): Promise<bigint | null> {
  try {
    const gas = await provider.estimateGas({ from, to, data });
    return gas;
  } catch (err) {
    console.warn("[Senza:Gas] estimateGas failed", err);
    return null;
  }
}

export function topicForEvent(abi: readonly string[], event: string) {
  const iface = new ethers.Interface(abi);
  return iface.getEvent(event)?.topicHash;
}
