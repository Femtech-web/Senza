const STORAGE = {
  VAULT: "senza_vault",
  DAPPS: "senza_dapps",
  PENDING: "senza_pending_dapps",
  PENDING_REQUESTS: "senza_pending_requests",
  CHAIN: "senza_chain_id",
  RPC: "senza_rpc_url",
};

const DEFAULT_RPC_BY_CHAIN = {
  "0x7a69": "http://127.0.0.1:8545",
  "0xaa36a7": "https://ethereum-sepolia-rpc.publicnode.com",
  "0x1": "https://ethereum.publicnode.com",
};

const pendingResponses = new Map();
let lastApprovalWindowAt = 0;

chrome.runtime.onInstalled.addListener(() => {
  console.log("Senza extension installed");
});

const updatePendingBadge = async () => {
  try {
    const pending = (await readStorage(STORAGE.PENDING_REQUESTS)) || [];
    const count = pending.length;
    if (count > 0) {
      await chrome.action.setBadgeBackgroundColor({ color: "#d075ff" });
      await chrome.action.setBadgeText({ text: count > 99 ? "99+" : String(count) });
    } else {
      await chrome.action.setBadgeText({ text: "" });
    }
  } catch (err) {
    console.warn("[Senza:BG] badge update failed", err);
  }
};

const notifyPendingRequest = async () => {
  await updatePendingBadge();
  try {
    if (chrome.action?.openPopup) {
      await chrome.action.openPopup();
      return;
    }
  } catch (err) {
    // openPopup can fail depending on browser state/gesture rules.
    console.warn("[Senza:BG] openPopup failed", err);
  }

  try {
    const now = Date.now();
    if (now - lastApprovalWindowAt < 1500) return;
    lastApprovalWindowAt = now;
    await chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 420,
      height: 760,
      focused: true,
    });
  } catch (err) {
    console.warn("[Senza:BG] windows.create fallback failed", err);
  }
};

const getOrigin = (sender) => {
  try {
    if (sender?.url) return new URL(sender.url).origin;
  } catch (err) {
    console.warn("[Senza:BG] origin parse failed", err);
  }
  return "unknown";
};

const readStorage = async (key) => {
  const result = await chrome.storage.local.get([key]);
  return result[key] ?? null;
};

const writeStorage = async (key, value) => {
  if (value === null) {
    await chrome.storage.local.remove([key]);
    return;
  }
  await chrome.storage.local.set({ [key]: value });
};

const getRpcUrl = async (chainId) => {
  const saved = await readStorage(STORAGE.RPC);
  if (typeof saved === "string" && saved.trim()) return saved.trim();
  return DEFAULT_RPC_BY_CHAIN[chainId] || DEFAULT_RPC_BY_CHAIN["0xaa36a7"];
};

const proxyJsonRpc = async (method, params, chainId) => {
  const rpcUrl = await getRpcUrl(chainId);
  let response;

  try {
    response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params: params ?? [],
      }),
    });
  } catch (err) {
    throw {
      code: 4900,
      message: `RPC request failed for ${method}: ${err?.message || "Network error"}`,
    };
  }

  if (!response.ok) {
    throw {
      code: 4900,
      message: `RPC endpoint responded with HTTP ${response.status} for ${method}`,
    };
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    throw {
      code: 4900,
      message: `RPC endpoint returned invalid JSON for ${method}`,
    };
  }

  if (payload?.error) {
    throw {
      code: payload.error.code ?? 4900,
      message: payload.error.message ?? `RPC error for ${method}`,
      data: payload.error.data,
    };
  }

  return payload?.result;
};

const shouldProxyJsonRpc = (method) => {
  if (typeof method !== "string" || !method) return false;
  if (method === "eth_subscribe" || method === "eth_unsubscribe") return false;
  if (method.startsWith("wallet_")) return false;
  return (
    method.startsWith("eth_") ||
    method.startsWith("net_") ||
    method.startsWith("web3_") ||
    method.startsWith("personal_")
  );
};

const getAccounts = async () => {
  const vault = await readStorage(STORAGE.VAULT);
  if (!vault) return [];
  if (vault.version === 2 && vault.wallets?.length) {
    return [vault.wallets[vault.activeIndex ?? 0]?.address].filter(Boolean);
  }
  if (vault.address) return [vault.address];
  return [];
};

const queuePendingRequest = async (id, origin, method, params) => {
  const pending = (await readStorage(STORAGE.PENDING_REQUESTS)) || [];
  if (!pending.some((item) => item.id === id)) {
    pending.push({
      id,
      origin,
      method,
      params,
      createdAt: new Date().toISOString(),
    });
    await writeStorage(STORAGE.PENDING_REQUESTS, pending);
    await notifyPendingRequest();
  }
};

const handleRequest = async (id, payload, sender) => {
  const { method, params } = payload || {};
  const origin = getOrigin(sender);
  const connected = (await readStorage(STORAGE.DAPPS)) || [];
  const pendingDapps = (await readStorage(STORAGE.PENDING)) || [];
  const chainId = (await readStorage(STORAGE.CHAIN)) || "0xaa36a7";

  const isConnected = connected.some((item) => item.origin === origin);

  switch (method) {
    case "eth_chainId":
      return chainId;
    case "net_version":
      return String(parseInt(chainId, 16));
    case "eth_accounts":
      if (!isConnected) return [];
      return await getAccounts();
    case "eth_requestAccounts": {
      if (!isConnected) {
        if (!pendingDapps.some((item) => item.origin === origin)) {
          pendingDapps.push({
            origin,
            name: origin,
            connectedAt: new Date().toISOString(),
            chainId: parseInt(chainId, 16),
          });
          await writeStorage(STORAGE.PENDING, pendingDapps);
        }
        await queuePendingRequest(id, origin, method, params);
        return new Promise((resolve, reject) => {
          pendingResponses.set(id, { resolve, reject });
        });
      }
      return await getAccounts();
    }
    case "wallet_requestPermissions":
      if (!isConnected) {
        await queuePendingRequest(id, origin, method, params);
        return new Promise((resolve, reject) => pendingResponses.set(id, { resolve, reject }));
      }
      return [{ parentCapability: "eth_accounts" }];
    case "wallet_getPermissions":
      return isConnected ? [{ parentCapability: "eth_accounts" }] : [];
    case "eth_sendTransaction":
    case "personal_sign":
    case "eth_sign":
    case "eth_signTypedData":
    case "eth_signTypedData_v3":
    case "eth_signTypedData_v4": {
      await queuePendingRequest(id, origin, method, params);
      return new Promise((resolve, reject) => {
        pendingResponses.set(id, { resolve, reject });
      });
    }
    case "wallet_switchEthereumChain":
    case "wallet_addEthereumChain":
    case "wallet_watchAsset": {
      await queuePendingRequest(id, origin, method, params);
      return new Promise((resolve, reject) => {
        pendingResponses.set(id, { resolve, reject });
      });
    }
    default:
      if (shouldProxyJsonRpc(method)) {
        return await proxyJsonRpc(method, params, chainId);
      }
      throw { code: 4200, message: `Unsupported method ${method}` };
  }
};

const resolvePending = async (id, result, error) => {
  const entry = pendingResponses.get(id);
  if (!entry) return;
  pendingResponses.delete(id);
  const pending = (await readStorage(STORAGE.PENDING_REQUESTS)) || [];
  const next = pending.filter((item) => item.id !== id);
  await writeStorage(STORAGE.PENDING_REQUESTS, next);
  await updatePendingBadge();

  if (error) {
    entry.reject(error);
  } else {
    entry.resolve(result);
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;

  if (message.type === "SENZA_REQUEST") {
    (async () => {
      try {
        const result = await handleRequest(message.id, message.payload, sender);
        sendResponse({ result });
      } catch (error) {
        sendResponse({
          error: {
            code: error?.code ?? 4001,
            message: error?.message ?? "Request rejected",
          },
        });
      }
    })();
    return true;
  }

  if (message.type === "SENZA_RESOLVE_REQUEST") {
    void resolvePending(message.id, message.result, message.error);
  }

  if (message.type === "SENZA_BROADCAST") {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (!tab.id) continue;
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: "SENZA_EVENT",
              event: message.event,
              data: message.data,
            });
          } catch {
            // Ignore tabs that don't have our content script injected.
          }
        }
      } catch (err) {
        console.warn("[Senza:BG] broadcast failed", err);
      }
    })();
  }
});
