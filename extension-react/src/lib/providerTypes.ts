export type DappConnection = {
  origin: string;
  name: string;
  icon?: string;
  connectedAt?: string;
  chainId?: number;
};

export type PendingRequest = {
  id: string;
  origin: string;
  method: string;
  params?: unknown;
  createdAt: string;
};
