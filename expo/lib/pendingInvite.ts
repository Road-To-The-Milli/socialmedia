import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "nc_pending_invite";

/** Persist an invite code entered during signup, to redeem after first login. */
export async function setPendingInvite(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, code.trim().toUpperCase());
  } catch {}
}

export async function getPendingInvite(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function clearPendingInvite(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
