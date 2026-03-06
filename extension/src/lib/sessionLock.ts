export const shouldRestoreSession = (params: {
  hasVault: boolean;
  sessionPassword?: string | null;
  lastUnlocked?: number | null;
  autoLockMinutes?: number | null;
}) => {
  const { hasVault, sessionPassword, lastUnlocked, autoLockMinutes } = params;
  if (!hasVault || !sessionPassword || !lastUnlocked) return false;
  if (!autoLockMinutes || autoLockMinutes <= 0) return true;
  return Date.now() - lastUnlocked <= autoLockMinutes * 60 * 1000;
};
