import { ethers } from "ethers";
import type { Dispatch, SetStateAction } from "react";
import type { DappConnection, PendingRequest } from "./providerTypes";

type StorageAPI = {
  saveStorage: (key: string, value: unknown) => Promise<void>;
  storageKeys: {
    DAPPS: string;
    PENDING: string;
    PENDING_REQUESTS: string;
  };
};

export const createProviderBridge = (params: {
  address?: string;
  signer?: ethers.Wallet | ethers.HDNodeWallet;
  pendingDapps: DappConnection[];
  connectedDapps: DappConnection[];
  pendingRequests: PendingRequest[];
  setPendingDapps: Dispatch<SetStateAction<DappConnection[]>>;
  setConnectedDapps: Dispatch<SetStateAction<DappConnection[]>>;
  setPendingRequests: Dispatch<SetStateAction<PendingRequest[]>>;
  chainId?: number;
  onSwitchChain?: (chainIdHex: string) => Promise<boolean>;
  storage: StorageAPI;
}) => {
  const {
    address,
    signer,
    pendingDapps,
    connectedDapps,
    pendingRequests,
    setPendingDapps,
    setConnectedDapps,
    setPendingRequests,
    storage,
    chainId,
    onSwitchChain,
  } = params;
  const CONNECTION_METHODS = new Set([
    "eth_requestAccounts",
    "wallet_requestPermissions",
  ]);

  const formatSiweMessage = (payload: Record<string, any>) => {
    if (!payload.domain || !payload.address) return null;
    const header = `${payload.domain} wants you to sign in with your Ethereum account:`;
    const addressLine = payload.address;
    const statement = payload.statement ? `\n\n${payload.statement}` : "";
    const uriLine = `\n\nURI: ${payload.uri ?? ""}`;
    const versionLine = `\nVersion: ${payload.version ?? "1"}`;
    const chainLine = `\nChain ID: ${payload.chainId ?? ""}`;
    const nonceLine = `\nNonce: ${payload.nonce ?? ""}`;
    const issuedAtLine = `\nIssued At: ${payload.issuedAt ?? ""}`;
    const expiration = payload.expirationTime ? `\nExpiration Time: ${payload.expirationTime}` : "";
    const notBefore = payload.notBefore ? `\nNot Before: ${payload.notBefore}` : "";
    const requestId = payload.requestId ? `\nRequest ID: ${payload.requestId}` : "";
    const resources = Array.isArray(payload.resources) && payload.resources.length > 0
      ? `\nResources:\n- ${payload.resources.join("\n- ")}`
      : "";

    return `${header}\n${addressLine}${statement}${uriLine}${versionLine}${chainLine}${nonceLine}${issuedAtLine}${expiration}${notBefore}${requestId}${resources}`;
  };

  const normalizeMessage = (value: unknown) => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const formatted = formatSiweMessage(value as Record<string, any>);
      if (formatted) return formatted;
      return JSON.stringify(value);
    }
    return String(value ?? "");
  };

  const resolveRequest = async (
    id: string,
    result?: unknown,
    error?: { code: number; message: string }
  ) => {
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: "SENZA_RESOLVE_REQUEST",
        id,
        result,
        error,
      });
    }
    const next = pendingRequests.filter((req) => req.id !== id);
    setPendingRequests(next);
    await storage.saveStorage(storage.storageKeys.PENDING_REQUESTS, next);
  };

  const approveDapp = async (origin: string) => {
    const dapp = pendingDapps.find((item) => item.origin === origin);
    const reqs = pendingRequests.filter(
      (item) => item.origin === origin && CONNECTION_METHODS.has(item.method)
    );
    const nextPending = pendingDapps.filter((item) => item.origin !== origin);
    const resolvedDapp: DappConnection =
      dapp ?? {
        origin,
        name: origin,
        chainId,
      };
    const nextConnected = [
      ...connectedDapps,
      { ...resolvedDapp, connectedAt: new Date().toISOString() },
    ];
    setPendingDapps(nextPending);
    setConnectedDapps(nextConnected);
    await storage.saveStorage(storage.storageKeys.PENDING, nextPending);
    await storage.saveStorage(storage.storageKeys.DAPPS, nextConnected);
    if (reqs.length > 0) {
      for (const req of reqs) {
        if (req.method === "wallet_requestPermissions") {
          await resolveRequest(req.id, [{ parentCapability: "eth_accounts" }]);
          continue;
        }
        await resolveRequest(req.id, [address]);
      }
      chrome.runtime.sendMessage({
        type: "SENZA_BROADCAST",
        event: "accountsChanged",
        data: [address],
      });
    }
  };

  const allowOnceDapp = async (origin: string) => {
    const reqs = pendingRequests.filter(
      (item) => item.origin === origin && CONNECTION_METHODS.has(item.method)
    );
    const nextPending = pendingDapps.filter((item) => item.origin !== origin);
    setPendingDapps(nextPending);
    await storage.saveStorage(storage.storageKeys.PENDING, nextPending);
    if (reqs.length > 0) {
      for (const req of reqs) {
        if (req.method === "wallet_requestPermissions") {
          await resolveRequest(req.id, [{ parentCapability: "eth_accounts" }]);
          continue;
        }
        await resolveRequest(req.id, [address]);
      }
      chrome.runtime.sendMessage({
        type: "SENZA_BROADCAST",
        event: "accountsChanged",
        data: [address],
      });
    }
  };

  const rejectDapp = async (origin: string) => {
    const nextPending = pendingDapps.filter((item) => item.origin !== origin);
    setPendingDapps(nextPending);
    await storage.saveStorage(storage.storageKeys.PENDING, nextPending);
    const reqs = pendingRequests.filter(
      (item) => item.origin === origin && CONNECTION_METHODS.has(item.method)
    );
    if (reqs.length > 0) {
      for (const req of reqs) {
        await resolveRequest(req.id, null, {
          code: 4001,
          message: "User rejected the request",
        });
      }
    }
  };

  const disconnectDapp = async (origin: string) => {
    const nextConnected = connectedDapps.filter((item) => item.origin !== origin);
    setConnectedDapps(nextConnected);
    await storage.saveStorage(storage.storageKeys.DAPPS, nextConnected);
  };

  const approveRequest = async (id: string) => {
    const req = pendingRequests.find((r) => r.id === id);
    if (!req || !signer) return;

    try {
      if (req.method === "eth_sendTransaction") {
        const tx = (req.params as any)?.[0] ?? {};
        const txResponse = await signer.sendTransaction(tx);
        await resolveRequest(id, txResponse.hash);
        return;
      }
      if (req.method === "eth_chainId") {
        await resolveRequest(id, chainId ? `0x${chainId.toString(16)}` : "0x0");
        return;
      }
      if (req.method === "net_version") {
        await resolveRequest(id, chainId ? String(chainId) : "0");
        return;
      }
      if (req.method === "wallet_watchAsset") {
        await resolveRequest(id, true);
        return;
      }
      if (req.method === "wallet_switchEthereumChain") {
        const params = (req.params as any)?.[0] ?? {};
        const chainIdHex = params.chainId as string | undefined;
        const ok = onSwitchChain ? await onSwitchChain(chainIdHex ?? "") : false;
        if (!ok) {
          await resolveRequest(id, null, {
            code: 4902,
            message: "Unsupported chain",
          });
          return;
        }
        await resolveRequest(id, null);
        chrome.runtime.sendMessage({
          type: "SENZA_BROADCAST",
          event: "chainChanged",
          data: chainIdHex ?? "0x0",
        });
        return;
      }
      if (req.method === "wallet_addEthereumChain") {
        const params = (req.params as any)?.[0] ?? {};
        const chainIdHex = params.chainId as string | undefined;
        const ok = onSwitchChain ? await onSwitchChain(chainIdHex ?? "") : false;
        if (!ok) {
          await resolveRequest(id, null, {
            code: 4902,
            message: "Unsupported chain",
          });
          return;
        }
        await resolveRequest(id, null);
        chrome.runtime.sendMessage({
          type: "SENZA_BROADCAST",
          event: "chainChanged",
          data: chainIdHex ?? "0x0",
        });
        return;
      }
      if (req.method === "personal_sign" || req.method === "eth_sign") {
        const params = (req.params as any) ?? [];
        const message =
          req.method === "eth_sign" ? params[1] ?? params[0] : params[0] ?? "";
        const normalized = normalizeMessage(message);
        const payload =
          typeof normalized === "string" && normalized.startsWith("0x")
            ? ethers.getBytes(normalized)
            : normalized;
        const signature = await signer.signMessage(payload);
        await resolveRequest(id, signature);
        return;
      }
      if (req.method === "eth_signTypedData_v4") {
        const typedData = JSON.parse(((req.params as any)?.[1] ?? "{}") as string);
        const signature = await signer.signTypedData(
          typedData.domain,
          typedData.types,
          typedData.message
        );
        await resolveRequest(id, signature);
        return;
      }
      if (req.method === "eth_signTypedData" || req.method === "eth_signTypedData_v3") {
        const typedDataRaw = (req.params as any)?.[1] ?? "{}";
        const typedData =
          typeof typedDataRaw === "string" ? JSON.parse(typedDataRaw) : typedDataRaw;
        const signature = await signer.signTypedData(
          typedData.domain,
          typedData.types,
          typedData.message
        );
        await resolveRequest(id, signature);
        return;
      }
      if (req.method === "wallet_requestPermissions") {
        await resolveRequest(id, [{ parentCapability: "eth_accounts" }]);
        return;
      }
      await resolveRequest(id, null, {
        code: 4200,
        message: "Unsupported request",
      });
    } catch (err) {
      await resolveRequest(id, null, {
        code: 4001,
        message: err instanceof Error ? err.message : "Request rejected",
      });
    }
  };

  const rejectRequest = async (id: string) => {
    await resolveRequest(id, null, {
      code: 4001,
      message: "User rejected the request",
    });
  };

  return {
    approveDapp,
    allowOnceDapp,
    rejectDapp,
    disconnectDapp,
    approveRequest,
    rejectRequest,
  };
};
