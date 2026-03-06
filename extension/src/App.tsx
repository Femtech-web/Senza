import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  DEFAULT_CONFIG,
  NETWORKS,
  NETWORKS_BY_KEY,
  type NetworkKey,
  type AppConfig,
  type SymbolKey,
} from "./config/tokens";
import { WalletProvider, useWallet } from "./providers/WalletProvider";
import { FhevmProvider, useFhevmContext } from "./providers/FhevmProvider";
import { useTokenActions } from "./hooks/useTokenActions";
import { useFHEDecrypt } from "./fhevm/react/useFHEDecrypt";
import { GenericStringInMemoryStorage } from "./fhevm/storage/GenericStringStorage";
import { Topbar } from "./components/Topbar";
import { DrawerNav, type NavItem } from "./components/DrawerNav";
import {
  TransactionReviewModal,
  type TxReview,
  type ReviewImpact,
} from "./components/TransactionReviewModal";
import { PermissionsPanel } from "./components/PermissionsPanel";
import { InternalApprovalModal } from "./components/InternalApprovalModal";
import { ActivityPanel } from "./components/ActivityPanel";
import { PendingDrawer } from "./components/PendingDrawer";
import { AccountMenu } from "./components/AccountMenu";
import { useActivityFeed } from "./hooks/useActivityFeed";
import { OverviewView } from "./views/OverviewView";
import { AssetsView } from "./views/AssetsView";
import { SettingsView } from "./views/SettingsView";
import { NetworksView } from "./views/NetworksView";
import {
  CreateImportView,
  SetPasswordView,
} from "./views/WalletOnboardingView";
import { WalletUnlockView } from "./views/WalletUnlockView";
import { WalletManageView } from "./views/WalletManageView";
import { AddWalletView } from "./views/AddWalletView";

import {
  loadNetworkConfig,
  loadStorage,
  rpcStorageKey,
  saveNetworkConfig,
  saveStorage,
  STORAGE_KEYS,
} from "./lib/configStorage";
import { buildImpact, estimateFees } from "./lib/txReview";
import { createProviderBridge } from "./lib/providerBridge";
import type { DappConnection, PendingRequest } from "./lib/providerTypes";

const BALANCE_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
] as const;

const C_BALANCE_ABI = [
  "function confidentialBalanceOf(address account) view returns (bytes32)",
] as const;

function formatDisplayAmount(value: string, fixedDecimals = 6): string {
  const [whole, fracRaw] = value.split(".");
  const frac = (fracRaw || "")
    .slice(0, fixedDecimals)
    .padEnd(fixedDecimals, "0");
  return `${whole}.${frac}`;
}

function formatTokenAmountCompact(value: string, maxDecimals = 6): string {
  if (!value.includes(".")) return value;
  const [whole, fracRaw] = value.split(".");
  const frac = (fracRaw || "").slice(0, maxDecimals).replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole;
}

type ImportMode = "privateKey" | "mnemonic";
type View =
  | "wallet"
  | "overview"
  | "assets"
  | "activity"
  | "permissions"
  | "networks"
  | "settings"
  | "add-wallet";

type InternalApproval = {
  id: string;
  origin: string;
  title: string;
  method: string;
  details?: { label: string; value: string }[];
  onApprove: () => Promise<void> | void;
};

type BalanceState = {
  underlying: string;
  cHandle: string;
  decimals: number;
  decrypted: string;
};

type TxReviewState = {
  review: TxReview;
  fee: string;
  impact: ReviewImpact[];
};

const STORAGE = STORAGE_KEYS;

const EMPTY_BALANCE: BalanceState = {
  underlying: "-",
  cHandle: "-",
  decimals: 6,
  decrypted: "-",
};

function SenzaPanel() {
  const [cfg, setCfg] = useState<AppConfig>(
    structuredClone(DEFAULT_CONFIG as any)
  );
  const [rpcDraft, setRpcDraft] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<SymbolKey>("USDC");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [onboardingStep, setOnboardingStep] = useState<
    "set-password" | "create-or-import"
  >("set-password");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [addPrivateKey, setAddPrivateKey] = useState("");
  const [addMnemonic, setAddMnemonic] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("privateKey");
  const [importValue, setImportValue] = useState("");
  const [wrapAmount, setWrapAmount] = useState("");
  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [ethBalance, setEthBalance] = useState("-");
  const [balancesBySymbol, setBalancesBySymbol] = useState<
    Record<SymbolKey, BalanceState>
  >({
    USDC: { ...EMPTY_BALANCE },
    USDT: { ...EMPTY_BALANCE },
  });
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [view, setView] = useState<View>("wallet");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [networkKey, setNetworkKey] = useState<NetworkKey>("sepolia");
  const [pendingDrawerOpen, setPendingDrawerOpen] = useState(false);
  const [enabledNetworks, setEnabledNetworks] = useState<NetworkKey[]>([
    "sepolia",
    "mainnet",
  ]);
  const [rpcDraftsByNetwork, setRpcDraftsByNetwork] = useState<
    Record<NetworkKey, string>
  >({
    hardhat: NETWORKS_BY_KEY.hardhat.rpcUrl,
    sepolia: NETWORKS_BY_KEY.sepolia.rpcUrl,
    mainnet: NETWORKS_BY_KEY.mainnet.rpcUrl,
  });
  const [addNetworkCandidate, setAddNetworkCandidate] = useState("hardhat");
  const showPendingBadge = false;
  const [reviewState, setReviewState] = useState<TxReviewState | null>(null);
  const [internalApproval, setInternalApproval] =
    useState<InternalApproval | null>(null);
  const [internalApprovalBusy, setInternalApprovalBusy] = useState(false);
  const [pendingAutoDecrypt, setPendingAutoDecrypt] =
    useState<BalanceState | null>(null);
  const [activityPage, setActivityPage] = useState(0);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [showDecrypted, setShowDecrypted] = useState<
    Record<SymbolKey, boolean>
  >({
    USDC: false,
    USDT: false,
  });
  const [decryptedHandleByKey, setDecryptedHandleByKey] = useState<
    Record<string, string>
  >({});
  const [connectTab, setConnectTab] = useState<"accounts" | "permissions">(
    "accounts"
  );
  const [connectedDapps, setConnectedDapps] = useState<DappConnection[]>([]);
  const [pendingDapps, setPendingDapps] = useState<DappConnection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const {
    provider,
    signer,
    address,
    chainId,
    ready,
    rpcUrl,
    hasVault,
    isLocked,
    accounts,
    activeIndex,
    setActiveIndex,
    autoLockMinutes,
    setAutoLockMinutes,
    touchActivity,
    setRpcUrl,
    createAccount,
    importPrivateKey,
    importMnemonic,
    unlock,
    lock,
    clearVault,
  } = useWallet();
  const { instance, status: fheStatus } = useFhevmContext();

  const showChrome = hasVault && !isLocked;

  const tokenConfig = useMemo(
    () => cfg.tokens[selectedAsset],
    [cfg, selectedAsset]
  );
  const { wrap, unwrap, confidentialSend } = useTokenActions(
    tokenConfig,
    selectedAsset
  );
  const decryptStorage = useMemo(() => new GenericStringInMemoryStorage(), []);

  const activity = useActivityFeed({ provider, address, tokens: cfg.tokens });

  const isZeroHandle = (value?: string) =>
    typeof value === "string" && /^0x0+$/.test(value);

  const trimHex = (value: string, left = 8, right = 6) =>
    value.length > left + right
      ? `${value.slice(0, left)}...${value.slice(-right)}`
      : value;

  const decryptRequests = useMemo(() => {
    const handle = balancesBySymbol[selectedAsset]?.cHandle;
    if (!handle || handle === "-" || !handle.startsWith("0x")) return [];
    if (isZeroHandle(handle)) return [];
    return [{ handle, contractAddress: tokenConfig.cToken as `0x${string}` }];
  }, [balancesBySymbol, selectedAsset, tokenConfig.cToken]);

  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    results: decryptedResults,
    error: decryptError,
  } = useFHEDecrypt({
    instance,
    ethersSigner: !isLocked
      ? (signer as unknown as ethers.JsonRpcSigner)
      : undefined,
    fhevmDecryptionSignatureStorage: decryptStorage,
    chainId,
    requests: decryptRequests,
  });

  const saveConfig = async () => {
    await saveNetworkConfig(networkKey, cfg);
    setStatus(`Saved ${selectedAsset} token config.`);
  };

  const loadConfig = async () => {
    const stored = await loadNetworkConfig(networkKey);
    if (stored) setCfg(stored);
  };

  const applyNetwork = async (
    nextKey: NetworkKey,
    options?: { skipEnabledCheck?: boolean }
  ) => {
    if (!options?.skipEnabledCheck && !enabledNetworks.includes(nextKey)) {
      notify("error", `${nextKey} is not enabled yet`);
      return;
    }
    const network = NETWORKS_BY_KEY[nextKey];
    setNetworkKey(nextKey);
    await saveStorage(STORAGE.NETWORK, nextKey);

    const savedConfig = await loadNetworkConfig(nextKey);
    setCfg(savedConfig ?? structuredClone(network.config));

    const savedRpc = await loadStorage<string>(rpcStorageKey(nextKey));
    const nextRpc = savedRpc || network.rpcUrl;
    setRpcDraft(nextRpc);
    setRpcDraftsByNetwork((prev) => ({ ...prev, [nextKey]: nextRpc }));
    if (nextRpc && nextRpc !== rpcUrl) {
      await setRpcUrl(nextRpc);
    }
    setNetworkOpen(false);
  };

  const switchNetworkByChainId = async (chainIdHex?: string) => {
    if (!chainIdHex) return false;
    const numeric = Number.parseInt(chainIdHex, 16);
    const target = NETWORKS.find((net) => net.chainId === numeric);
    if (!target) return false;
    if (!enabledNetworks.includes(target.key as NetworkKey)) return false;
    await applyNetwork(target.key as NetworkKey);
    return true;
  };

  useEffect(() => {
    if (!ready) return;
    const bootNetwork = async () => {
      const storedEnabled = await loadStorage<NetworkKey[]>(
        STORAGE.NETWORKS_ENABLED
      );
      const allowed = new Set<NetworkKey>(["hardhat", "sepolia", "mainnet"]);
      const nextEnabled = (storedEnabled ?? ["sepolia", "mainnet"]).filter((k) =>
        allowed.has(k)
      );
      const safeEnabled =
        nextEnabled.length > 0 ? nextEnabled : (["sepolia", "mainnet"] as NetworkKey[]);
      setEnabledNetworks(safeEnabled);

      const rpcValues: Record<NetworkKey, string> = {
        hardhat:
          (await loadStorage<string>(rpcStorageKey("hardhat"))) ??
          NETWORKS_BY_KEY.hardhat.rpcUrl,
        sepolia:
          (await loadStorage<string>(rpcStorageKey("sepolia"))) ??
          NETWORKS_BY_KEY.sepolia.rpcUrl,
        mainnet:
          (await loadStorage<string>(rpcStorageKey("mainnet"))) ??
          NETWORKS_BY_KEY.mainnet.rpcUrl,
      };
      setRpcDraftsByNetwork(rpcValues);

      const storedKey = await loadStorage<NetworkKey>(STORAGE.NETWORK);
      const nextKey =
        storedKey &&
        storedKey in NETWORKS_BY_KEY &&
        safeEnabled.includes(storedKey)
          ? storedKey
          : safeEnabled[0];
      await applyNetwork(nextKey, { skipEnabledCheck: true });
    };
    void bootNetwork();
  }, [ready]);

  const loadConnections = async () => {
    const [connected, pending] = await Promise.all([
      loadStorage<DappConnection[]>(STORAGE.DAPPS),
      loadStorage<DappConnection[]>(STORAGE.PENDING),
    ]);
    setConnectedDapps(connected ?? []);
    setPendingDapps(pending ?? []);
  };

  const loadPendingRequests = async () => {
    const stored = await loadStorage<PendingRequest[]>(
      STORAGE.PENDING_REQUESTS
    );
    setPendingRequests(stored ?? []);
  };

  useEffect(() => {
    void loadConfig();
    void loadConnections();
    void loadPendingRequests();
  }, []);

  useEffect(() => {
    if (!chrome?.storage?.onChanged) return;
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "local") return;
      if (changes[STORAGE.DAPPS]) {
        setConnectedDapps(
          (changes[STORAGE.DAPPS].newValue as DappConnection[]) ?? []
        );
      }
      if (changes[STORAGE.PENDING]) {
        setPendingDapps(
          (changes[STORAGE.PENDING].newValue as DappConnection[]) ?? []
        );
      }
      if (changes[STORAGE.PENDING_REQUESTS]) {
        setPendingRequests(
          (changes[STORAGE.PENDING_REQUESTS].newValue as PendingRequest[]) ?? []
        );
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  useEffect(() => {
    const fallbackChainId = NETWORKS_BY_KEY[networkKey].chainId;
    setCfg((prev) => ({
      ...prev,
      chainIdHex: `0x${(chainId ?? fallbackChainId).toString(16)}`,
    }));
    void saveStorage(
      STORAGE.CHAIN,
      `0x${(chainId ?? fallbackChainId).toString(16)}`
    );
  }, [chainId, networkKey]);

  useEffect(() => {
    setRpcDraft(rpcUrl);
  }, [rpcUrl]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!chrome?.runtime?.sendMessage) return;
    chrome.runtime.sendMessage({
      type: "SENZA_BROADCAST",
      event: "chainChanged",
      data: chainId ? `0x${chainId.toString(16)}` : "0x0",
    });
  }, [chainId]);

  useEffect(() => {
    if (!chrome?.runtime?.sendMessage) return;
    const accounts = hasVault && !isLocked && address ? [address] : [];
    chrome.runtime.sendMessage({
      type: "SENZA_BROADCAST",
      event: "accountsChanged",
      data: accounts,
    });
  }, [address, hasVault, isLocked]);

  useEffect(() => {
    if (!networkOpen) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest(".network-select")) return;
      setNetworkOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [networkOpen]);

  useEffect(() => {
    if (!showChrome) return;
    const handler = () => void touchActivity();
    window.addEventListener("mousemove", handler);
    window.addEventListener("keydown", handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("focus", handler);
    };
  }, [showChrome, touchActivity]);

  useEffect(() => {
    if (!hasVault || isLocked) {
      setView("wallet");
      return;
    }
    if (view === "wallet") setView("overview");
  }, [hasVault, isLocked, view]);

  useEffect(() => {
    if (view === "activity") {
      void activity.refresh();
    }
  }, [view, activity]);

  useEffect(() => {
    setActivityPage(0);
  }, [activity.items.length, view]);

  const notify = (kind: "success" | "error", message: string) => {
    setToast({ kind, message });
    setStatus(message);
  };

  const runAction = async (name: string, fn: () => Promise<void>) => {
    if (busyAction) return;
    setBusyAction(name);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  };

  const isValidAddress = (value?: string) =>
    Boolean(value && ethers.isAddress(value));

  const handleLock = () => {
    void runAction("lock", async () => {
      lock();
      notify("success", "Wallet locked");
    });
  };

  const refreshBalancesFor = useCallback(
    async (symbol: SymbolKey, quiet = false) => {
      if (!provider || !address) return;
      try {
        const cfgToken = cfg.tokens[symbol];
        const hasUnderlying = isValidAddress(cfgToken.underlying);
        const hasConfidential = isValidAddress(cfgToken.cToken);

        const [ethRaw, tokenDecimals, tokenRaw, encryptedBalance] =
          await Promise.all([
            provider.getBalance(address),
            hasUnderlying
              ? new ethers.Contract(cfgToken.underlying, BALANCE_ABI, provider)
                  .decimals()
                  .catch(() => 6)
              : Promise.resolve(6),
            hasUnderlying
              ? new ethers.Contract(cfgToken.underlying, BALANCE_ABI, provider)
                  .balanceOf(address)
                  .catch(() => 0n)
              : Promise.resolve(0n),
            hasConfidential
              ? new ethers.Contract(cfgToken.cToken, C_BALANCE_ABI, provider)
                  .confidentialBalanceOf(address)
                  .catch(() => null)
              : Promise.resolve(null),
          ]);

        setEthBalance(formatDisplayAmount(ethers.formatEther(ethRaw), 6));
        const handleString = encryptedBalance ? String(encryptedBalance) : "";
        const nextBalance: BalanceState = {
          underlying: hasUnderlying
            ? formatTokenAmountCompact(
                ethers.formatUnits(tokenRaw, Number(tokenDecimals)),
                6
              )
            : "-",
          cHandle:
            handleString && !isZeroHandle(handleString)
              ? handleString
              : "Unavailable",
          decimals: Number(tokenDecimals),
          decrypted: "-",
        };
        setBalancesBySymbol((prev) => {
          const prevHandle = prev[symbol].cHandle;
          const next = {
            ...prev,
            [symbol]: nextBalance,
          };
          if (address && prevHandle && prevHandle !== nextBalance.cHandle) {
            setShowDecrypted((prevShow) => ({
              ...prevShow,
              [symbol]: false,
            }));
            setDecryptedHandleByKey((prevHandles) => {
              const key = `${address}:${symbol}`;
              if (!(key in prevHandles)) return prevHandles;
              const copy = { ...prevHandles };
              delete copy[key];
              return copy;
            });
          }
          return next;
        });
        if (!quiet) setStatus("Balances refreshed");
        return nextBalance;
      } catch (err) {
        if (!quiet) {
          const message =
            err instanceof Error ? err.message : "Failed to fetch balances";
          setStatus(message);
        }
      }
    },
    [provider, address, cfg]
  );

  const refreshAllBalances = useCallback(async () => {
    if (!provider || !address) return;
    setLoadingBalances(true);
    await refreshBalancesFor("USDC", true);
    await refreshBalancesFor("USDT", true);
    setLoadingBalances(false);
    setStatus("Balances refreshed");
  }, [provider, address, refreshBalancesFor]);

  const getUnderlyingRawBalance = useCallback(
    async (symbol: SymbolKey) => {
      if (!provider || !address) return null;
      const tokenAddress = cfg.tokens[symbol].underlying;
      if (!isValidAddress(tokenAddress)) return null;
      const erc20 = new ethers.Contract(tokenAddress, BALANCE_ABI, provider);
      const balance = (await erc20.balanceOf(address)) as bigint;
      return balance;
    },
    [provider, address, cfg]
  );

  const waitForUnwrapFinalization = useCallback(
    async (symbol: SymbolKey, beforeUnderlying: bigint, attempt = 0) => {
      const current = await getUnderlyingRawBalance(symbol);
      if (current !== null && current > beforeUnderlying) {
        await refreshBalancesFor(symbol, true);
        setStatus(`Unwrap finalized. ${symbol} balance updated.`);
        return;
      }
      if (attempt >= 12) return;
      window.setTimeout(() => {
        void waitForUnwrapFinalization(symbol, beforeUnderlying, attempt + 1);
      }, 5000);
    },
    [getUnderlyingRawBalance, refreshBalancesFor]
  );

  useEffect(() => {
    void refreshBalancesFor(selectedAsset, true);
  }, [selectedAsset, refreshBalancesFor]);

  useEffect(() => {
    void refreshAllBalances();
  }, [provider, address, networkKey, refreshAllBalances]);

  useEffect(() => {
    if (!address) return;
    setShowDecrypted({ USDC: false, USDT: false });
    setDecryptedHandleByKey({});
    setBalancesBySymbol((prev) => ({
      ...prev,
      USDC: { ...prev.USDC, decrypted: "-" },
      USDT: { ...prev.USDT, decrypted: "-" },
    }));
  }, [address]);

  useEffect(() => {
    if (!decryptedResults || decryptRequests.length === 0) return;
    const handle = decryptRequests[0].handle;
    const clear = decryptedResults[handle];
    if (clear === undefined || clear === null) return;
    const key = address ? `${address}:${selectedAsset}` : "";
    const knownHandle = key ? decryptedHandleByKey[key] : undefined;
    try {
      const normalized =
        typeof clear === "bigint" ? clear : BigInt(String(clear));
      setBalancesBySymbol((prev) => {
        if (prev[selectedAsset].cHandle !== handle) return prev;
        return {
          ...prev,
          [selectedAsset]: {
            ...prev[selectedAsset],
            decrypted: ethers.formatUnits(
              normalized,
              prev[selectedAsset].decimals
            ),
          },
        };
      });
      if (address && (!knownHandle || knownHandle !== handle)) {
        setDecryptedHandleByKey((prev) => ({
          ...prev,
          [`${address}:${selectedAsset}`]: handle,
        }));
      }
      if (!knownHandle || knownHandle !== handle) {
        setShowDecrypted((prev) => ({ ...prev, [selectedAsset]: true }));
      }
    } catch {
      setBalancesBySymbol((prev) => {
        if (prev[selectedAsset].cHandle !== handle) return prev;
        return {
          ...prev,
          [selectedAsset]: {
            ...prev[selectedAsset],
            decrypted: String(clear),
          },
        };
      });
      if (address && (!knownHandle || knownHandle !== handle)) {
        setDecryptedHandleByKey((prev) => ({
          ...prev,
          [`${address}:${selectedAsset}`]: handle,
        }));
      }
      if (!knownHandle || knownHandle !== handle) {
        setShowDecrypted((prev) => ({ ...prev, [selectedAsset]: true }));
      }
    }
  }, [
    decryptedResults,
    decryptRequests,
    selectedAsset,
    address,
    decryptedHandleByKey,
  ]);

  useEffect(() => {
    if (internalApproval || !pendingAutoDecrypt) return;
    const target = pendingAutoDecrypt;
    if (!isValidAddress(tokenConfig.cToken)) {
      setPendingAutoDecrypt(null);
      return;
    }
    if (isZeroHandle(target.cHandle) || target.cHandle === "Unavailable") {
      setPendingAutoDecrypt(null);
      return;
    }
    if (!canDecrypt) return;
    setPendingAutoDecrypt(null);
    void performDecryptBalance();
  }, [internalApproval, pendingAutoDecrypt, canDecrypt, tokenConfig.cToken]);

  useEffect(() => {
    if (decryptError) setStatus(decryptError);
  }, [decryptError]);

  const handleCreate = async () => {
    await runAction("create", async () => {
      try {
        if (password.length < 8)
          throw new Error("Password must be at least 8 characters");
        if (password !== confirmPassword)
          throw new Error("Passwords do not match");
        const wallet = await createAccount(password);
        notify("success", `Vault created for ${wallet}`);
        setPassword("");
        setConfirmPassword("");
        setOnboardingStep("set-password");
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Create failed");
      }
    });
  };

  const handleImport = async () => {
    await runAction("import", async () => {
      try {
        if (password.length < 8)
          throw new Error("Password must be at least 8 characters");
        if (password !== confirmPassword)
          throw new Error("Passwords do not match");
        const wallet =
          importMode === "privateKey"
            ? await importPrivateKey(importValue, password)
            : await importMnemonic(importValue, password);
        notify("success", `Imported ${wallet}`);
        setPassword("");
        setConfirmPassword("");
        setImportValue("");
        setOnboardingStep("set-password");
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Import failed");
      }
    });
  };

  const handleUnlock = async () => {
    await runAction("unlock", async () => {
      try {
        await unlock(unlockPassword);
        notify("success", "Wallet unlocked");
        setUnlockPassword("");
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Unlock failed");
      }
    });
  };

  const executeWrap = async (amount: string) => {
    await runAction("wrap", async () => {
      try {
        const hash = await wrap(amount);
        activity.trackPending(
          hash,
          `Wrap ${selectedAsset}`,
          `-${amount} ${selectedAsset} → c${selectedAsset}`
        );
        setTxHash(hash);
        setWrapAmount("");
        notify("success", "Wrap successful");
        await refreshBalancesFor(selectedAsset, true);
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Wrap failed");
      }
    });
  };

  const executeUnwrap = async (amount: string) => {
    await runAction("unwrap", async () => {
      try {
        const beforeUnderlying = await getUnderlyingRawBalance(selectedAsset);
        const hash = await unwrap(amount);
        activity.trackPending(
          hash,
          `Unwrap ${selectedAsset}`,
          `+${amount} ${selectedAsset} from c${selectedAsset}`
        );
        setTxHash(hash);
        setUnwrapAmount("");
        notify(
          "success",
          "Unwrap submitted. Finalization may take a few seconds."
        );
        await refreshBalancesFor(selectedAsset, true);
        if (beforeUnderlying !== null) {
          void waitForUnwrapFinalization(selectedAsset, beforeUnderlying);
        }
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Unwrap failed");
      }
    });
  };

  const executeSend = async (to: string, amount: string) => {
    await runAction("send", async () => {
      try {
        const hash = await confidentialSend(to, amount);
        activity.trackPending(
          hash,
          `Send c${selectedAsset}`,
          `${amount} c${selectedAsset} → ${to.slice(0, 6)}...`
        );
        setTxHash(hash);
        setSendAmount("");
        setSendTo("");
        notify("success", "Confidential send successful");
        await refreshBalancesFor(selectedAsset, true);
      } catch (err) {
        notify(
          "error",
          err instanceof Error ? err.message : "Confidential send failed"
        );
      }
    });
  };

  const performDecryptBalance = async () => {
    await runAction("decrypt", async () => {
      decrypt();
    });
  };

  const requestDecryptApproval = async (override?: BalanceState) => {
    if (internalApproval) return;
    const targetBalance = override ?? activeBalance;
    const quiet = Boolean(override);
    if (!confidentialEnabled) {
      if (!quiet)
        notify("error", "Confidential token not configured for this network");
      return;
    }
    if (
      isZeroHandle(targetBalance.cHandle) ||
      targetBalance.cHandle === "Unavailable"
    ) {
      if (!quiet) notify("error", "No confidential balance to decrypt yet");
      return;
    }
    if (!canDecrypt) {
      if (!quiet) notify("error", "FHE decrypt not ready yet");
      return;
    }
    const handle = targetBalance.cHandle;
    setInternalApproval({
      id: `internal-${Date.now()}`,
      origin: "Senza Wallet",
      title: `Decrypt c${selectedAsset} balance`,
      method: "userDecrypt",
      details: [
        { label: "Network", value: networkInfo.label },
        { label: "Token", value: `c${selectedAsset}` },
        { label: "Handle", value: trimHex(String(handle)) },
      ],
      onApprove: async () => {
        await performDecryptBalance();
      },
    });
  };

  const openReview = async (review: TxReview) => {
    if (!review.amount) {
      notify("error", "Enter an amount to continue");
      return;
    }
    if (review.kind === "send" && !review.to) {
      notify("error", "Enter a recipient address");
      return;
    }

    const decimals = balancesBySymbol[selectedAsset].decimals;
    const amount = ethers.parseUnits(review.amount, decimals);
    const fee = await estimateFees({
      review,
      amount,
      provider,
      address,
      tokenConfig,
    });
    const impact = buildImpact(
      review,
      amount,
      selectedAsset,
      balancesBySymbol[selectedAsset]
    );
    setReviewState({ review, fee, impact });
  };

  const requestInternalApproval = (input: {
    title: string;
    method: string;
    details?: { label: string; value: string }[];
    onApprove: () => Promise<void> | void;
  }) => {
    setInternalApproval({
      id: `internal-${Date.now()}`,
      origin: "Senza Wallet",
      title: input.title,
      method: input.method,
      details: input.details,
      onApprove: input.onApprove,
    });
  };

  const confirmReview = async () => {
    if (!reviewState) return;
    const { review } = reviewState;
    setReviewState(null);
    if (review.kind === "wrap") {
      return requestInternalApproval({
        title: `Wrap ${selectedAsset}`,
        method: "wrap",
        details: [
          { label: "Network", value: networkInfo.label },
          { label: "Token", value: selectedAsset },
          { label: "Amount", value: review.amount },
        ],
        onApprove: async () => {
          await executeWrap(review.amount);
          const refreshed = await refreshBalancesFor(selectedAsset, true);
          if (refreshed) setPendingAutoDecrypt(refreshed);
        },
      });
    }
    if (review.kind === "unwrap") {
      return requestInternalApproval({
        title: `Unwrap c${selectedAsset}`,
        method: "unwrap",
        details: [
          { label: "Network", value: networkInfo.label },
          { label: "Token", value: `c${selectedAsset}` },
          { label: "Amount", value: review.amount },
        ],
        onApprove: async () => {
          await executeUnwrap(review.amount);
          const refreshed = await refreshBalancesFor(selectedAsset, true);
          if (refreshed) setPendingAutoDecrypt(refreshed);
        },
      });
    }
    if (review.kind === "send" && review.to) {
      const recipient = review.to;
      return requestInternalApproval({
        title: `Send c${selectedAsset}`,
        method: "confidentialTransfer",
        details: [
          { label: "Network", value: networkInfo.label },
          { label: "Token", value: `c${selectedAsset}` },
          { label: "Amount", value: review.amount },
          { label: "Recipient", value: trimHex(recipient, 10, 8) },
        ],
        onApprove: async () => {
          await executeSend(recipient, review.amount);
          const refreshed = await refreshBalancesFor(selectedAsset, true);
          if (refreshed) setPendingAutoDecrypt(refreshed);
        },
      });
    }
  };

  const {
    approveDapp,
    allowOnceDapp,
    rejectDapp,
    disconnectDapp,
    approveRequest,
    rejectRequest,
  } = createProviderBridge({
    address,
    signer,
    chainId,
    pendingDapps,
    connectedDapps,
    pendingRequests,
    setPendingDapps,
    setConnectedDapps,
    setPendingRequests,
    onSwitchChain: switchNetworkByChainId,
    storage: {
      saveStorage,
      storageKeys: {
        DAPPS: STORAGE.DAPPS,
        PENDING: STORAGE.PENDING,
        PENDING_REQUESTS: STORAGE.PENDING_REQUESTS,
      },
    },
  });

  useEffect(() => {
    const hasPendingConnect =
      pendingRequests.some(
        (req) =>
          req.method === "eth_requestAccounts" ||
          req.method === "wallet_requestPermissions"
      ) || pendingDapps.length > 0;
    if (!hasPendingConnect) {
      setConnectTab("accounts");
    }
  }, [pendingDapps, pendingRequests]);

  if (!ready) {
    return (
      <main className="popup">
        <section className="loader">
          <div className="spinner" />
          <p className="note">Loading Senza...</p>
        </section>
      </main>
    );
  }

  const navItems: NavItem[] = [
    { key: "overview", label: "Overview" },
    { key: "assets", label: "Assets" },
    { key: "activity", label: "Activity" },
    { key: "permissions", label: "Permissions" },
    { key: "networks", label: "Networks" },
    { key: "settings", label: "Settings" },
  ];
  const availableNetworks = NETWORKS.filter((net) =>
    enabledNetworks.includes(net.key as NetworkKey)
  );

  const activeBalance = balancesBySymbol[selectedAsset];
  const networkInfo = NETWORKS_BY_KEY[networkKey];
  const confidentialEnabled = isValidAddress(tokenConfig.cToken);
  const fheReady = fheStatus === "ready";
  const activityPageSize = 10;
  const activityPageCount = Math.ceil(activity.items.length / activityPageSize);
  const activityStart = activityPage * activityPageSize;
  const activityItems = activity.items.slice(
    activityStart,
    activityStart + activityPageSize
  );
  const connectionMethods = new Set([
    "eth_requestAccounts",
    "wallet_requestPermissions",
  ]);
  const pendingConnectRequest = pendingRequests.find((req) =>
    connectionMethods.has(req.method)
  );
  const pendingConnectOrigin =
    pendingConnectRequest?.origin ?? pendingDapps[0]?.origin ?? null;

  return (
    <main className="popup app">
      {showChrome ? (
        <>
          <Topbar
            address={address}
            chainId={chainId}
            onMenu={() => setIsNavOpen(true)}
            onAccountMenu={() => setAccountMenuOpen((prev) => !prev)}
            networks={availableNetworks}
            activeNetworkKey={networkKey}
            networkOpen={networkOpen}
            onToggleNetwork={() => setNetworkOpen((prev) => !prev)}
            onSelectNetwork={(key) => {
              void applyNetwork(key as NetworkKey);
            }}
            pendingCount={showPendingBadge ? activity.pendingCount : 0}
            onPendingClick={() => setPendingDrawerOpen(true)}
          />
          <AccountMenu
            open={accountMenuOpen}
            accounts={accounts}
            activeIndex={activeIndex}
            onSelect={(index) => {
              setAccountMenuOpen(false);
              setActiveIndex(index);
            }}
            onClose={() => setAccountMenuOpen(false)}
            onAdd={() => {
              setAccountMenuOpen(false);
              setView("add-wallet");
            }}
          />
          <DrawerNav
            open={isNavOpen}
            onClose={() => setIsNavOpen(false)}
            items={navItems}
            activeKey={view}
            onSelect={(key) => {
              setView(key as View);
              setIsNavOpen(false);
            }}
            fheStatus={fheStatus}
            onLock={handleLock}
            lockBusy={busyAction === "lock"}
          />
        </>
      ) : (
        <Topbar
          address={address}
          chainId={chainId}
          onMenu={() => {}}
          onAccountMenu={() => {}}
          compact
        />
      )}

      <section className="content">
        {view === "settings" && (
          <SettingsView
            rpcDraft={rpcDraft}
            networkLabel={networkInfo.label}
            selectedAsset={selectedAsset}
            cfg={cfg}
            autoLockMinutes={autoLockMinutes}
            busyAction={busyAction}
            onRpcDraft={setRpcDraft}
            onSaveRpc={() =>
              runAction("rpc", async () => {
                try {
                  await setRpcUrl(rpcDraft);
                  await saveStorage(rpcStorageKey(networkKey), rpcDraft);
                  notify("success", "RPC updated");
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Invalid RPC URL"
                  );
                }
              })
            }
            onSelectAsset={(asset) => setSelectedAsset(asset)}
            onTokenChange={(asset, field, value) =>
              setCfg((prev) => ({
                ...prev,
                tokens: {
                  ...prev.tokens,
                  [asset]: {
                    ...prev.tokens[asset],
                    [field]: value,
                  },
                },
              }))
            }
            onSaveTokens={() =>
              runAction("saveToken", async () => {
                try {
                  await saveConfig();
                  notify("success", "Token addresses saved");
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Save failed"
                  );
                }
              })
            }
            onAutoLockMinutes={setAutoLockMinutes}
            resetConfirm={resetConfirm}
            onAskReset={() => setResetConfirm(true)}
            onCancelReset={() => setResetConfirm(false)}
            onConfirmReset={() =>
              runAction("reset", async () => {
                try {
                  await clearVault();
                  setResetConfirm(false);
                  notify("success", "Vault reset");
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Clear failed"
                  );
                }
              })
            }
          />
        )}

        {view === "networks" && (
          <NetworksView
            networks={availableNetworks.map((net) => ({
              key: net.key as NetworkKey,
              label: net.label,
              chainId: net.chainId,
            }))}
            activeNetworkKey={networkKey}
            rpcDrafts={rpcDraftsByNetwork}
            addCandidate={addNetworkCandidate}
            busyAction={busyAction}
            onSwitch={(key) => {
              void applyNetwork(key);
            }}
            onRpcDraft={(key, value) =>
              setRpcDraftsByNetwork((prev) => ({ ...prev, [key]: value }))
            }
            onSaveRpc={(key) =>
              runAction(`rpc-${key}`, async () => {
                const value = (rpcDraftsByNetwork[key] ?? "").trim();
                if (!value) {
                  notify("error", "RPC URL is required");
                  return;
                }
                try {
                  await saveStorage(rpcStorageKey(key), value);
                  if (networkKey === key) {
                    await setRpcUrl(value);
                    setRpcDraft(value);
                  }
                  notify("success", `${NETWORKS_BY_KEY[key].shortLabel} RPC updated`);
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Failed to save RPC"
                  );
                }
              })
            }
            onAddCandidate={setAddNetworkCandidate}
            onAddNetwork={() => {
              const selected = addNetworkCandidate as NetworkKey | "custom";
              if (selected === "custom") {
                notify(
                  "error",
                  "Unsupported network. Only Hardhat, Sepolia, and Mainnet are supported."
                );
                return;
              }
              if (!["hardhat", "sepolia", "mainnet"].includes(selected)) {
                notify(
                  "error",
                  "Unsupported network. Only Hardhat, Sepolia, and Mainnet are supported."
                );
                return;
              }
              if (enabledNetworks.includes(selected as NetworkKey)) {
                notify(
                  "success",
                  `${NETWORKS_BY_KEY[selected as NetworkKey].shortLabel} is already added`
                );
                return;
              }
              const next = [...enabledNetworks, selected as NetworkKey];
              setEnabledNetworks(next);
              void saveStorage(STORAGE.NETWORKS_ENABLED, next);
              notify(
                "success",
                `${NETWORKS_BY_KEY[selected as NetworkKey].shortLabel} network added`
              );
            }}
          />
        )}

        {view === "overview" && (
          <>
            <OverviewView
              address={address}
              ethBalance={ethBalance}
              loadingBalances={loadingBalances}
              balances={balancesBySymbol}
              selectedAsset={selectedAsset}
              onRefresh={refreshAllBalances}
              onSelectAsset={(symbol) => {
                setSelectedAsset(symbol);
                setView("assets");
              }}
            />
            <section className="card status-card">
              <p className="section-title">Status</p>
              <div className="stats">
                <div>
                  <p className="stat-label">FHE</p>
                  <p className="stat-value">{fheStatus}</p>
                </div>
                <div>
                  <p className="stat-label">Message</p>
                  <p className="stat-value">{status}</p>
                </div>
                <div className="mono">
                  <p className="stat-label">Last tx</p>
                  <p className="stat-value">{txHash ? txHash : "-"}</p>
                </div>
              </div>
            </section>
          </>
        )}

        {view === "assets" && (
          <AssetsView
            selectedAsset={selectedAsset}
            networkLabel={networkInfo.label}
            activeBalance={activeBalance}
            showDecrypted={showDecrypted[selectedAsset]}
            busy={busyAction !== null}
            decrypting={busyAction === "decrypt" || isDecrypting}
            confidentialEnabled={confidentialEnabled}
            fheReady={fheReady}
            wrapAmount={wrapAmount}
            unwrapAmount={unwrapAmount}
            sendTo={sendTo}
            sendAmount={sendAmount}
            onBack={() => setView("overview")}
            onRefresh={() => refreshBalancesFor(selectedAsset)}
            onDecrypt={() => void requestDecryptApproval()}
            onToggleDecrypted={() => {
              setShowDecrypted((prev) => ({
                ...prev,
                [selectedAsset]: !prev[selectedAsset],
              }));
            }}
            onWrapAmount={setWrapAmount}
            onUnwrapAmount={setUnwrapAmount}
            onSendTo={setSendTo}
            onSendAmount={setSendAmount}
            onOpenReview={(review) => void openReview(review)}
          />
        )}

        {view === "activity" && (
          <ActivityPanel
            items={activityItems}
            loading={activity.loading}
            page={activityPage}
            pageCount={activityPageCount}
            total={activity.items.length}
            onPrev={() => setActivityPage((prev) => Math.max(prev - 1, 0))}
            onNext={() =>
              setActivityPage((prev) =>
                Math.min(prev + 1, Math.max(activityPageCount - 1, 0))
              )
            }
            onRefresh={activity.refresh}
            onOpenTx={(hash) => {
              const base =
                networkKey === "mainnet"
                  ? "https://etherscan.io/tx/"
                  : "https://sepolia.etherscan.io/tx/";
              const url = `${base}${hash}`;
              if (chrome?.tabs?.create) {
                chrome.tabs.create({ url });
              } else {
                window.open(url, "_blank", "noopener,noreferrer");
              }
            }}
          />
        )}

        {view === "permissions" && (
          <PermissionsPanel
            connected={connectedDapps}
            pending={pendingDapps}
            pendingRequests={pendingRequests}
            chainId={chainId}
            onApprove={approveDapp}
            onAllowOnce={allowOnceDapp}
            onReject={rejectDapp}
            onDisconnect={disconnectDapp}
            onApproveRequest={approveRequest}
            onRejectRequest={rejectRequest}
          />
        )}

        {view === "wallet" &&
          !hasVault &&
          onboardingStep === "set-password" && (
            <SetPasswordView
              password={password}
              confirmPassword={confirmPassword}
              busy={busyAction !== null}
              onPassword={setPassword}
              onConfirmPassword={setConfirmPassword}
              onContinue={() => {
                if (password.length < 8) {
                  notify("error", "Password must be at least 8 characters");
                  return;
                }
                if (password !== confirmPassword) {
                  notify("error", "Passwords do not match");
                  return;
                }
                setOnboardingStep("create-or-import");
              }}
            />
          )}

        {view === "wallet" &&
          !hasVault &&
          onboardingStep === "create-or-import" && (
            <CreateImportView
              importMode={importMode}
              importValue={importValue}
              busy={busyAction !== null}
              onCreate={() => void handleCreate()}
              onImport={() => void handleImport()}
              onBack={() => setOnboardingStep("set-password")}
              onImportMode={setImportMode}
              onImportValue={setImportValue}
            />
          )}

        {view === "wallet" && hasVault && isLocked && (
          <WalletUnlockView
            unlockPassword={unlockPassword}
            busy={busyAction !== null}
            onUnlockPassword={setUnlockPassword}
            onUnlock={() => void handleUnlock()}
          />
        )}

        {view === "wallet" && hasVault && !isLocked && (
          <WalletManageView
            address={address}
            busy={busyAction !== null}
            addPrivateKey={addPrivateKey}
            addMnemonic={addMnemonic}
            onCreateNew={() =>
              runAction("createNew", async () => {
                try {
                  const wallet = await createAccount();
                  notify("success", `Created ${wallet}`);
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Create failed"
                  );
                }
              })
            }
            onAddPrivateKey={setAddPrivateKey}
            onAddMnemonic={setAddMnemonic}
            onImportPrivateKey={() =>
              runAction("importPk", async () => {
                try {
                  const wallet = await importPrivateKey(addPrivateKey);
                  notify("success", `Imported ${wallet}`);
                  setAddPrivateKey("");
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Import failed"
                  );
                }
              })
            }
            onImportMnemonic={() =>
              runAction("importMnemonic", async () => {
                try {
                  const wallet = await importMnemonic(addMnemonic);
                  notify("success", `Imported ${wallet}`);
                  setAddMnemonic("");
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Import failed"
                  );
                }
              })
            }
          />
        )}

        {view === "add-wallet" && hasVault && !isLocked && (
          <AddWalletView
            busy={busyAction !== null}
            addPrivateKey={addPrivateKey}
            addMnemonic={addMnemonic}
            onCreateNew={() =>
              runAction("createNew", async () => {
                try {
                  const wallet = await createAccount();
                  notify("success", `Created ${wallet}`);
                  setView("overview");
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Create failed"
                  );
                }
              })
            }
            onAddPrivateKey={setAddPrivateKey}
            onAddMnemonic={setAddMnemonic}
            onImportPrivateKey={() =>
              runAction("importPk", async () => {
                try {
                  const wallet = await importPrivateKey(addPrivateKey);
                  notify("success", `Imported ${wallet}`);
                  setAddPrivateKey("");
                  setView("overview");
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Import failed"
                  );
                }
              })
            }
            onImportMnemonic={() =>
              runAction("importMnemonic", async () => {
                try {
                  const wallet = await importMnemonic(addMnemonic);
                  notify("success", `Imported ${wallet}`);
                  setAddMnemonic("");
                  setView("overview");
                } catch (err) {
                  notify(
                    "error",
                    err instanceof Error ? err.message : "Import failed"
                  );
                }
              })
            }
            onBack={() => setView("overview")}
          />
        )}
      </section>

      {reviewState && (
        <TransactionReviewModal
          review={reviewState.review}
          feeEstimate={reviewState.fee}
          impact={reviewState.impact}
          selectedAsset={selectedAsset}
          busy={busyAction !== null}
          onCancel={() => setReviewState(null)}
          onConfirm={() => void confirmReview()}
        />
      )}

      {internalApproval && (
        <InternalApprovalModal
          title={internalApproval.title}
          origin={internalApproval.origin}
          method={internalApproval.method}
          details={internalApproval.details ?? []}
          busy={internalApprovalBusy}
          onReject={() => setInternalApproval(null)}
          onApprove={async () => {
            if (internalApprovalBusy) return;
            setInternalApprovalBusy(true);
            try {
              await internalApproval.onApprove();
            } finally {
              setInternalApprovalBusy(false);
              setInternalApproval(null);
            }
          }}
        />
      )}

      {showChrome && pendingConnectOrigin && (
        <section className="connect-approval-overlay">
          <section className="connect-approval-sheet">
            <div className="connect-approval-body">
              <div className="connect-avatar">
                {pendingConnectOrigin[0]?.toUpperCase() ?? "D"}
              </div>
              <h3 className="connect-title">
                {pendingConnectOrigin.replace(/^https?:\/\//, "")}
              </h3>
              <p className="note">Connect this website with Senza</p>
              <div className="connect-tabs">
                <button
                  className={connectTab === "accounts" ? "active" : ""}
                  onClick={() => setConnectTab("accounts")}
                >
                  Accounts
                </button>
                <button
                  className={connectTab === "permissions" ? "active" : ""}
                  onClick={() => setConnectTab("permissions")}
                >
                  Permissions
                </button>
              </div>
              {connectTab === "accounts" ? (
                <div className="permission-card">
                  <div>
                    <p className="stat-label">Selected account</p>
                    <p className="stat-value mono">{address ?? "-"}</p>
                  </div>
                  <div>
                    <p className="stat-label">Origin</p>
                    <p className="stat-value mono">{pendingConnectOrigin}</p>
                  </div>
                </div>
              ) : (
                <div className="permission-card">
                  <div>
                    <p className="stat-label">Requested permissions</p>
                    <p className="stat-value">View wallet address</p>
                  </div>
                  <div>
                    <p className="stat-value">Request signature approvals</p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="btn secondary"
                onClick={() => void rejectDapp(pendingConnectOrigin)}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={() => void approveDapp(pendingConnectOrigin)}
              >
                Connect
              </button>
            </div>
          </section>
        </section>
      )}

      <PendingDrawer
        open={pendingDrawerOpen}
        items={activity.pendingItems}
        onClose={() => setPendingDrawerOpen(false)}
        onOpenTx={(hash) => {
          const base =
            networkKey === "mainnet"
              ? "https://etherscan.io/tx/"
              : "https://sepolia.etherscan.io/tx/";
          const url = `${base}${hash}`;
          if (chrome?.tabs?.create) {
            chrome.tabs.create({ url });
          } else {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }}
      />

      {toast && (
        <section className={`toast ${toast.kind === "success" ? "ok" : "err"}`}>
          {toast.message}
        </section>
      )}
    </main>
  );
}

export function App() {
  const { rpcUrl, chainId } = useWallet();
  return (
    <FhevmProvider provider={rpcUrl} chainId={chainId}>
      <SenzaPanel />
    </FhevmProvider>
  );
}

export default function RootApp() {
  return (
    <WalletProvider>
      <App />
    </WalletProvider>
  );
}
