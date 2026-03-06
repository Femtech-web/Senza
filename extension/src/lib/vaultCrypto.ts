import { ethers } from "ethers";

export const DEFAULT_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
export const VAULT_STORAGE_KEY = "senza_vault";
export const RPC_STORAGE_KEY = "senza_rpc_url";
export const AUTOLOCK_STORAGE_KEY = "senza_autolock_minutes";
export const LAST_ACTIVE_KEY = "senza_last_active";
export const SESSION_PASSWORD_KEY = "senza_session_password";
export const LAST_UNLOCKED_KEY = "senza_last_unlocked";

export type VaultWallet = {
  address: string;
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
  createdAt: number;
};

export type EncryptedVaultV2 = {
  version: 2;
  wallets: VaultWallet[];
  activeIndex: number;
};

export type EncryptedVaultV1 = {
  version: 1;
  address: string;
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
  createdAt: number;
};

export type EncryptedVault = EncryptedVaultV2 | EncryptedVaultV1;

const enc = new TextEncoder();
const dec = new TextDecoder();

const asBuffer = (value: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy.buffer as ArrayBuffer;
};

const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

export const readStorage = async <T,>(key: string): Promise<T | null> => {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const data = await chrome.storage.local.get([key]);
    return (data[key] as T | undefined) ?? null;
  }
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
};

export const writeStorage = async <T,>(
  key: string,
  value: T | null
): Promise<void> => {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    if (value === null) {
      await chrome.storage.local.remove([key]);
      return;
    }
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  if (value === null) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
};

export const normalizeVault = (vault: EncryptedVault | null): EncryptedVaultV2 | null => {
  if (!vault) return null;
  if ((vault as EncryptedVaultV2).version === 2) return vault as EncryptedVaultV2;

  const legacy = vault as EncryptedVaultV1;
  return {
    version: 2,
    wallets: [
      {
        address: legacy.address,
        ciphertext: legacy.ciphertext,
        iv: legacy.iv,
        salt: legacy.salt,
        iterations: legacy.iterations,
        createdAt: legacy.createdAt,
      },
    ],
    activeIndex: 0,
  };
};

export const encryptPrivateKey = async (
  privateKey: string,
  password: string,
  address: string
): Promise<VaultWallet> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 310000;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(privateKey)
  );

  return {
    address,
    ciphertext: toBase64(new Uint8Array(cipher)),
    iv: toBase64(iv),
    salt: toBase64(salt),
    iterations,
    createdAt: Date.now(),
  };
};

export const decryptPrivateKey = async (
  wallet: VaultWallet,
  password: string
): Promise<string> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(fromBase64(wallet.salt)),
      iterations: wallet.iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuffer(fromBase64(wallet.iv)) },
    key,
    asBuffer(fromBase64(wallet.ciphertext))
  );
  return dec.decode(plain);
};

export const isValidPrivateKey = (key: string) =>
  ethers.isHexString(key, 32);
