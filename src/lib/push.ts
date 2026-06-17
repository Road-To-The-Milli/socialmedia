import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    // Enregistre le SW si pas encore fait
    await navigator.serviceWorker.register("/sw.js");
    // Timeout de 5s pour éviter un hang infini si le SW plante
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("sw-timeout")), 5000),
    );
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } catch {
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await getSWRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribePush(): Promise<PushSubscription> {
  const reg = await getSWRegistration();
  if (!reg) throw new Error("Service Worker non disponible");

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

export async function unsubscribePush(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  await sub.unsubscribe();
}

export async function saveSubscriptionToSupabase(sub: PushSubscription, userId: string): Promise<void> {
  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: (json.keys as Record<string, string>).p256dh,
      auth: (json.keys as Record<string, string>).auth,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) throw error;
}

export async function deleteSubscriptionFromSupabase(sub: PushSubscription, userId: string): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .match({ user_id: userId, endpoint: sub.endpoint });
  if (error) throw error;
}

/** Appelle l'Edge Function pour envoyer une notification à tous les membres d'un space sauf l'expéditeur. */
export async function sendPushNotification(payload: {
  space_id: string;
  sender_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<void> {
  try {
    await supabase.functions.invoke("send-push", { body: payload });
  } catch {
    // Notifs non critiques — on ignore les erreurs silencieusement
  }
}
