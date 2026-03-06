import { ethers } from "ethers";
import { type TokenConfig, type SymbolKey } from "../config/tokens";
import { useFhevmContext } from "../providers/FhevmProvider";
import { useWallet } from "../providers/WalletProvider";
import { ABIS } from "../abis";

export function useTokenActions(config: TokenConfig, symbol: SymbolKey) {
  const { signer, address } = useWallet();
  const { instance } = useFhevmContext();

  const ensureConfigured = () => {
    if (!ethers.isAddress(config.underlying)) {
      throw new Error("Token is not configured for this network");
    }
    if (!ethers.isAddress(config.cToken)) {
      throw new Error("Confidential token is not configured for this network");
    }
  };

  const tokenAbi = symbol === "USDC" ? ABIS.ConfidentialUSDC : ABIS.ConfidentialUSDT;

  const wrap = async (amountInput: string) => {
    ensureConfigured();
    if (!signer || !address) throw new Error("Connect wallet first");
    console.log("[Senza:Tx] wrap:start", { address, token: config.cToken, amountInput });
    const erc20 = new ethers.Contract(config.underlying, ABIS.ERC20, signer);
    const cToken = new ethers.Contract(config.cToken, tokenAbi, signer);
    const decimals = await erc20.decimals();
    const amount = ethers.parseUnits(amountInput, decimals);
    console.log("[Senza:Tx] wrap:parsed", { decimals: Number(decimals), amount: amount.toString() });
    const approveTx = await erc20.approve(config.cToken, amount);
    console.log("[Senza:Tx] wrap:approveTx", { hash: approveTx.hash });
    await approveTx.wait();
    const wrapTx = await cToken.wrap(address, amount);
    console.log("[Senza:Tx] wrap:wrapTx", { hash: wrapTx.hash });
    await wrapTx.wait();
    return wrapTx.hash as string;
  };

  const unwrap = async (amountInput: string) => {
    ensureConfigured();
    if (!signer || !address || !instance)
      throw new Error("Connect wallet first or wait for FHE initialization");
    console.log("[Senza:Tx] unwrap:start", { address, token: config.cToken, amountInput });
    const cToken = new ethers.Contract(config.cToken, tokenAbi, signer);
    const decimals = await cToken.decimals();
    const amount = ethers.parseUnits(amountInput, decimals);

    if (amount > 18446744073709551615n) {
      throw new Error("Amount too large for uint64");
    }
    const input = await instance.createEncryptedInput(config.cToken, address);
    input.add64(Number(amount));
    const { handles, inputProof } = await input.encrypt();
    console.log("[Senza:Tx] unwrap:encrypted", {
      handles: handles.length,
      proofBytes: inputProof.length,
    });

    const tx = await cToken["unwrap(address,address,bytes32,bytes)"](
      address,
      address,
      handles[0],
      inputProof
    );
    console.log("[Senza:Tx] unwrap:tx", { hash: tx.hash });
    const receipt = await tx.wait();

    // The handle to disclose is emitted in UnwrapRequested and may differ from input handle.
    let requestedHandle: string | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = cToken.interface.parseLog(log);
        if (parsed && parsed.name === "UnwrapRequested") {
          requestedHandle = String(parsed.args[1]);
          break;
        }
      } catch {
        continue;
      }
    }

    if (requestedHandle) {
      try {
        const discloseTx = await cToken.requestDiscloseEncryptedAmount(requestedHandle);
        console.log("[Senza:Tx] unwrap:requestDisclose", {
          hash: discloseTx.hash,
          handle: requestedHandle,
        });
        await discloseTx.wait();

        const sleep = (ms: number) =>
          new Promise<void>((resolve) => window.setTimeout(resolve, ms));

        let finalized = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          try {
            const decrypted = await instance.publicDecrypt([requestedHandle]);
            const raw =
              (decrypted.clearValues as Record<string, string | bigint | boolean>)[requestedHandle] ??
              Object.values(decrypted.clearValues)[0];
            if (raw === undefined || raw === null || typeof raw === "boolean") {
              throw new Error("Invalid clear unwrap amount from public decrypt");
            }
            const clearAmount = typeof raw === "bigint" ? raw : BigInt(String(raw));

            const finalizeTx = await cToken.finalizeUnwrap(
              requestedHandle,
              clearAmount,
              decrypted.decryptionProof
            );
            console.log("[Senza:Tx] unwrap:finalizeUnwrap", {
              hash: finalizeTx.hash,
              handle: requestedHandle,
              clearAmount: clearAmount.toString(),
            });
            await finalizeTx.wait();
            finalized = true;
            break;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const retryable =
              message.includes("not_ready_for_decryption") ||
              message.includes("not ready") ||
              message.includes("still pending");
            console.warn("[Senza:Tx] unwrap:finalize retry", {
              attempt: attempt + 1,
              retryable,
              message,
            });
            if (!retryable && attempt >= 2) break;
            await sleep(3000);
          }
        }

        if (!finalized) {
          console.warn("[Senza:Tx] unwrap:finalizeUnwrap not completed yet");
        }
      } catch (err) {
        console.warn("[Senza:Tx] unwrap:requestDisclose failed", err);
      }
    } else {
      console.warn("[Senza:Tx] unwrap:requestDisclose skipped (UnwrapRequested not found)");
    }

    return tx.hash as string;
  };

  const confidentialSend = async (to: string, amountInput: string) => {
    ensureConfigured();
    if (!signer || !address || !instance)
      throw new Error("Connect wallet first or wait for FHE initialization");
    if (!ethers.isAddress(to)) throw new Error("Invalid recipient");

    console.log("[Senza:Tx] send:start", { from: address, to, token: config.cToken, amountInput });
    const cToken = new ethers.Contract(config.cToken, tokenAbi, signer);
    const decimals = await cToken.decimals();
    const amount = ethers.parseUnits(amountInput, decimals);

    if (amount > 18446744073709551615n) {
      throw new Error("Amount too large for uint64");
    }
    const input = await instance.createEncryptedInput(config.cToken, address);
    input.add64(Number(amount));
    const { handles, inputProof } = await input.encrypt();
    console.log("[Senza:Tx] send:encrypted", {
      handles: handles.length,
      proofBytes: inputProof.length,
    });

    const tx = await cToken["confidentialTransfer(address,bytes32,bytes)"](
      to,
      handles[0],
      inputProof
    );
    console.log("[Senza:Tx] send:tx", { hash: tx.hash });
    await tx.wait();
    return tx.hash as string;
  };

  return { wrap, unwrap, confidentialSend };
}
