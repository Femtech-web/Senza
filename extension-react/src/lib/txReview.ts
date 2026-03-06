import { ethers } from "ethers";
import type { ReviewImpact, TxReview } from "../components/TransactionReviewModal";
import { buildCToken, buildErc20, estimateGasByData } from "./contractHelpers";

type BalanceState = {
  underlying: string;
  decrypted: string;
  decimals: number;
};

export const parseNumeric = (value: string, decimals: number) => {
  if (!value || value === "-" || Number.isNaN(Number(value))) return null;
  try {
    return ethers.parseUnits(value, decimals);
  } catch {
    return null;
  }
};

export const buildImpact = (
  review: TxReview,
  amount: bigint,
  asset: string,
  balance: BalanceState
) => {
  const underlyingBefore = parseNumeric(balance.underlying, balance.decimals);
  const decryptedBefore = parseNumeric(balance.decrypted, balance.decimals);

  const impact: ReviewImpact[] = [];
  if (review.kind === "wrap") {
    const afterUnderlying =
      underlyingBefore !== null ? underlyingBefore - amount : null;
    impact.push({
      label: `${asset} balance`,
      before:
        underlyingBefore !== null
          ? ethers.formatUnits(underlyingBefore, balance.decimals)
          : "-",
      after:
        afterUnderlying !== null
          ? ethers.formatUnits(afterUnderlying, balance.decimals)
          : "-",
    });
    impact.push({
      label: `c${asset} balance`,
      before:
        decryptedBefore !== null
          ? ethers.formatUnits(decryptedBefore, balance.decimals)
          : "encrypted",
      after:
        decryptedBefore !== null
          ? ethers.formatUnits(decryptedBefore + amount, balance.decimals)
          : "encrypted + amount",
    });
  }

  if (review.kind === "unwrap") {
    const afterUnderlying =
      underlyingBefore !== null ? underlyingBefore + amount : null;
    impact.push({
      label: `${asset} balance`,
      before:
        underlyingBefore !== null
          ? ethers.formatUnits(underlyingBefore, balance.decimals)
          : "-",
      after:
        afterUnderlying !== null
          ? ethers.formatUnits(afterUnderlying, balance.decimals)
          : "-",
    });
    impact.push({
      label: `c${asset} balance`,
      before:
        decryptedBefore !== null
          ? ethers.formatUnits(decryptedBefore, balance.decimals)
          : "encrypted",
      after:
        decryptedBefore !== null
          ? ethers.formatUnits(decryptedBefore - amount, balance.decimals)
          : "encrypted - amount",
    });
  }

  if (review.kind === "send") {
    impact.push({
      label: `c${asset} balance`,
      before:
        decryptedBefore !== null
          ? ethers.formatUnits(decryptedBefore, balance.decimals)
          : "encrypted",
      after:
        decryptedBefore !== null
          ? ethers.formatUnits(decryptedBefore - amount, balance.decimals)
          : "encrypted - amount",
    });
  }

  return impact;
};

export const estimateFees = async (params: {
  review: TxReview;
  amount: bigint;
  provider?: ethers.JsonRpcProvider;
  address?: string;
  tokenConfig: { cToken: string; underlying: string };
}) => {
  const { review, amount, provider, address, tokenConfig } = params;
  if (!provider || !address) return "-";
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
    if (!gasPrice) return "-";

    let gasLimit: bigint | null = null;
    if (review.kind === "wrap") {
      const erc20 = buildErc20(tokenConfig.underlying, provider);
      const cToken = buildCToken(tokenConfig.cToken, provider);
      const approveData = erc20.interface.encodeFunctionData("approve", [
        tokenConfig.cToken,
        amount,
      ]);
      const wrapData = cToken.interface.encodeFunctionData("wrap", [
        address,
        amount,
      ]);
      const approveGas = await estimateGasByData(
        provider,
        address,
        tokenConfig.underlying,
        approveData
      );
      const wrapGas = await estimateGasByData(
        provider,
        address,
        tokenConfig.cToken,
        wrapData
      );
      if (approveGas && wrapGas) gasLimit = approveGas + wrapGas;
    }
    if (review.kind === "unwrap") {
      const cToken = buildCToken(tokenConfig.cToken, provider);
      const data = cToken.interface.encodeFunctionData("unwrap", [
        address,
        address,
        ethers.ZeroHash,
        "0x",
      ]);
      gasLimit = await estimateGasByData(
        provider,
        address,
        tokenConfig.cToken,
        data
      );
    }
    if (review.kind === "send") {
      const cToken = buildCToken(tokenConfig.cToken, provider);
      const data = cToken.interface.encodeFunctionData(
        "confidentialTransfer",
        [address, ethers.ZeroHash, "0x"]
      );
      gasLimit = await estimateGasByData(
        provider,
        address,
        tokenConfig.cToken,
        data
      );
    }

    if (!gasLimit)
      return `${Number(ethers.formatUnits(gasPrice, "gwei")).toFixed(2)} gwei`;

    const fee = gasLimit * gasPrice;
    return `${ethers.formatEther(fee)} ETH`;
  } catch {
    return "-";
  }
};
