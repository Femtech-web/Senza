import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ethers } from "ethers";
import {
  AUTOLOCK_STORAGE_KEY,
  DEFAULT_RPC_URL,
  EncryptedVault,
  EncryptedVaultV2,
  LAST_ACTIVE_KEY,
  LAST_UNLOCKED_KEY,
  RPC_STORAGE_KEY,
  SESSION_PASSWORD_KEY,
  VAULT_STORAGE_KEY,
  decryptPrivateKey,
  encryptPrivateKey,
  normalizeVault,
  readStorage,
  writeStorage,
} from "../lib/vaultCrypto";
import { shouldRestoreSession } from "../lib/sessionLock";

type WalletCtx = {
  provider?: ethers.JsonRpcProvider;
  signer?: ethers.Wallet | ethers.HDNodeWallet;
  address?: string;
  chainId?: number;
  rpcUrl: string;
  hasVault: boolean;
  isLocked: boolean;
  ready: boolean;
  accounts: { address: string; createdAt: number }[];
  activeIndex: number;
  setActiveIndex: (index: number) => Promise<void>;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => Promise<void>;
  touchActivity: () => Promise<void>;
  setRpcUrl: (url: string) => Promise<void>;
  createAccount: (password?: string) => Promise<string>;
  importPrivateKey: (privateKey: string, password?: string) => Promise<string>;
  importMnemonic: (mnemonic: string, password?: string) => Promise<string>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  clearVault: () => Promise<void>;
};

const WalletContext = createContext<WalletCtx | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<ethers.JsonRpcProvider>();
  const [signer, setSigner] = useState<ethers.Wallet | ethers.HDNodeWallet>();
  const [address, setAddress] = useState<string>();
  const [chainId, setChainId] = useState<number>();
  const [rpcUrl, setRpcUrlState] = useState<string>(DEFAULT_RPC_URL);
  const [vault, setVault] = useState<EncryptedVaultV2 | null>(null);
  const [ready, setReady] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [sessionPassword, setSessionPassword] = useState<string | null>(null);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(7 * 24 * 60);
  const [lastActive, setLastActive] = useState<number>(Date.now());

  useEffect(() => {
    const boot = async () => {
      const [savedVault, savedRpc] = await Promise.all([
        readStorage<EncryptedVault>(VAULT_STORAGE_KEY),
        readStorage<string>(RPC_STORAGE_KEY),
      ]);
      const savedAutoLock = await readStorage<number>(AUTOLOCK_STORAGE_KEY);
      const savedLastActive = await readStorage<number>(LAST_ACTIVE_KEY);
      const savedSessionPassword = await readStorage<string>(SESSION_PASSWORD_KEY);
      const savedLastUnlocked = await readStorage<number>(LAST_UNLOCKED_KEY);

      if (savedRpc && typeof savedRpc === "string") {
        setRpcUrlState(savedRpc);
      }
      const normalized = normalizeVault(savedVault);
      if (normalized) {
        setVault(normalized);
        await writeStorage(VAULT_STORAGE_KEY, normalized);
      }
      if (typeof savedAutoLock === "number") {
        setAutoLockMinutesState(savedAutoLock);
      }
      if (typeof savedLastActive === "number") {
        setLastActive(savedLastActive);
      }

      const shouldRestore = shouldRestoreSession({
        hasVault: Boolean(normalized),
        sessionPassword: savedSessionPassword,
        lastUnlocked: savedLastUnlocked,
        autoLockMinutes: savedAutoLock,
      });

      if (normalized && shouldRestore && savedSessionPassword) {
        try {
          const active = normalized.wallets[normalized.activeIndex];
          const privateKey = await decryptPrivateKey(active, savedSessionPassword);
          const wallet = new ethers.Wallet(privateKey);
          await attachWallet(wallet, savedRpc || DEFAULT_RPC_URL);
          setSessionPassword(savedSessionPassword);
          setIsLocked(false);
          const now = Date.now();
          setLastActive(now);
          await writeStorage(LAST_ACTIVE_KEY, now);
        } catch {
          await writeStorage(SESSION_PASSWORD_KEY, null);
          await writeStorage(LAST_UNLOCKED_KEY, null);
        }
      }
      setReady(true);
    };

    void boot();
  }, []);

  useEffect(() => {
    if (!vault || isLocked) return;
    const interval = setInterval(async () => {
      if (autoLockMinutes <= 0) return;
      const now = Date.now();
      const cutoff = autoLockMinutes * 60 * 1000;
      if (now - lastActive > cutoff) {
        lock();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [vault, isLocked, autoLockMinutes, lastActive]);

  const attachWallet = async (
    wallet: ethers.Wallet | ethers.HDNodeWallet,
    rpc: string
  ) => {
    const rpcProvider = new ethers.JsonRpcProvider(rpc);
    const connected = wallet.connect(rpcProvider);
    const network = await rpcProvider.getNetwork();

    setProvider(rpcProvider);
    setSigner(connected);
    setAddress(wallet.address);
    setChainId(Number(network.chainId));
    setIsLocked(false);
  };

  const setRpcUrl = async (url: string) => {
    const next = url.trim();
    if (!next) throw new Error("RPC URL is required");
    setRpcUrlState(next);
    await writeStorage(RPC_STORAGE_KEY, next);

    if (signer) {
      await attachWallet(new ethers.Wallet(signer.privateKey), next);
    }
  };

  const ensurePassword = (password?: string) => {
    const pwd = (password ?? sessionPassword ?? "").trim();
    if (!pwd) throw new Error("Password required");
    return pwd;
  };

  const persistVault = async (next: EncryptedVaultV2) => {
    setVault(next);
    await writeStorage(VAULT_STORAGE_KEY, next);
  };

  const createAccount = async (password?: string) => {
    const pwd = ensurePassword(password);
    const wallet = ethers.Wallet.createRandom();
    const entry = await encryptPrivateKey(wallet.privateKey, pwd, wallet.address);

    if (!vault) {
      const next: EncryptedVaultV2 = { version: 2, wallets: [entry], activeIndex: 0 };
      await persistVault(next);
      await attachWallet(wallet, rpcUrl);
      setSessionPassword(pwd);
      return wallet.address;
    }

    const next = {
      ...vault,
      wallets: [...vault.wallets, entry],
      activeIndex: vault.wallets.length,
    };
    await persistVault(next);
    await attachWallet(wallet, rpcUrl);
    setSessionPassword(pwd);
    await writeStorage(SESSION_PASSWORD_KEY, pwd);
    await writeStorage(LAST_UNLOCKED_KEY, Date.now());
    return wallet.address;
  };

  const importPrivateKey = async (privateKey: string, password?: string) => {
    const cleaned = privateKey.trim();
    if (!cleaned.startsWith("0x")) throw new Error("Private key must be 0x prefixed");
    const pwd = ensurePassword(password);

    const wallet = new ethers.Wallet(cleaned);
    const entry = await encryptPrivateKey(wallet.privateKey, pwd, wallet.address);

    if (!vault) {
      const next: EncryptedVaultV2 = { version: 2, wallets: [entry], activeIndex: 0 };
      await persistVault(next);
      await attachWallet(wallet, rpcUrl);
      setSessionPassword(pwd);
      return wallet.address;
    }

    const next = {
      ...vault,
      wallets: [...vault.wallets, entry],
      activeIndex: vault.wallets.length,
    };
    await persistVault(next);
    await attachWallet(wallet, rpcUrl);
    setSessionPassword(pwd);
    await writeStorage(SESSION_PASSWORD_KEY, pwd);
    await writeStorage(LAST_UNLOCKED_KEY, Date.now());
    return wallet.address;
  };

  const importMnemonic = async (mnemonic: string, password?: string) => {
    const phrase = mnemonic.trim();
    if (!phrase) throw new Error("Seed phrase is required");
    const pwd = ensurePassword(password);

    const wallet = ethers.Wallet.fromPhrase(phrase);
    const entry = await encryptPrivateKey(wallet.privateKey, pwd, wallet.address);

    if (!vault) {
      const next: EncryptedVaultV2 = { version: 2, wallets: [entry], activeIndex: 0 };
      await persistVault(next);
      await attachWallet(wallet, rpcUrl);
      setSessionPassword(pwd);
      return wallet.address;
    }

    const next = {
      ...vault,
      wallets: [...vault.wallets, entry],
      activeIndex: vault.wallets.length,
    };
    await persistVault(next);
    await attachWallet(wallet, rpcUrl);
    setSessionPassword(pwd);
    await writeStorage(SESSION_PASSWORD_KEY, pwd);
    await writeStorage(LAST_UNLOCKED_KEY, Date.now());
    return wallet.address;
  };

  const unlock = async (password: string) => {
    if (!vault) throw new Error("No vault found");
    const active = vault.wallets[vault.activeIndex];
    const privateKey = await decryptPrivateKey(active, password);
    const wallet = new ethers.Wallet(privateKey);
    await attachWallet(wallet, rpcUrl);
    setSessionPassword(password);
    await writeStorage(SESSION_PASSWORD_KEY, password);
    const now = Date.now();
    setLastActive(now);
    await writeStorage(LAST_ACTIVE_KEY, now);
    await writeStorage(LAST_UNLOCKED_KEY, now);
  };

  const setActiveIndex = async (index: number) => {
    if (!vault) return;
    if (index < 0 || index >= vault.wallets.length) return;
    if (isLocked) throw new Error("Unlock vault first");
    const pwd = ensurePassword();

    const entry = vault.wallets[index];
    const privateKey = await decryptPrivateKey(entry, pwd);
    const wallet = new ethers.Wallet(privateKey);

    const next = { ...vault, activeIndex: index };
    await persistVault(next);
    await attachWallet(wallet, rpcUrl);
    await writeStorage(LAST_UNLOCKED_KEY, Date.now());
  };

  const lock = () => {
    setSigner(undefined);
    setAddress(undefined);
    setIsLocked(true);
    setSessionPassword(null);
    void writeStorage(SESSION_PASSWORD_KEY, null);
    void writeStorage(LAST_UNLOCKED_KEY, null);
  };

  const clearVault = async () => {
    await writeStorage(VAULT_STORAGE_KEY, null);
    await writeStorage(SESSION_PASSWORD_KEY, null);
    await writeStorage(LAST_UNLOCKED_KEY, null);
    setVault(null);
    setSigner(undefined);
    setAddress(undefined);
    setIsLocked(true);
    setSessionPassword(null);
  };

  const setAutoLockMinutes = async (minutes: number) => {
    const safe = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
    setAutoLockMinutesState(safe);
    await writeStorage(AUTOLOCK_STORAGE_KEY, safe);
  };

  const touchActivity = async () => {
    const now = Date.now();
    setLastActive(now);
    await writeStorage(LAST_ACTIVE_KEY, now);
  };

  const accounts = useMemo(() => {
    if (!vault) return [];
    return vault.wallets.map((wallet) => ({
      address: wallet.address,
      createdAt: wallet.createdAt,
    }));
  }, [vault]);

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        chainId,
        rpcUrl,
        hasVault: Boolean(vault),
        isLocked,
        ready,
        accounts,
        activeIndex: vault?.activeIndex ?? 0,
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
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
