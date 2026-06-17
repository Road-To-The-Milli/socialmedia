import { useCallback, useEffect, useState } from "react";
import {
  deleteSubscriptionFromSupabase,
  getExistingSubscription,
  pushSupported,
  saveSubscriptionToSupabase,
  subscribePush,
  unsubscribePush,
} from "@/lib/push";
import { useAuth } from "@/lib/auth";

export type PushState = "unsupported" | "denied" | "subscribed" | "unsubscribed" | "loading";

export function usePush() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>("loading");

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    const sub = await getExistingSubscription();
    setState(sub ? "subscribed" : "unsubscribed");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const sub = await subscribePush();
      await saveSubscriptionToSupabase(sub, user.id);
      setState("subscribed");
    } catch (err) {
      if (Notification.permission === "denied") {
        setState("denied");
      } else {
        setState("unsubscribed");
      }
      throw err;
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setState("loading");
    try {
      const sub = await getExistingSubscription();
      if (sub) await deleteSubscriptionFromSupabase(sub, user.id);
      await unsubscribePush();
      setState("unsubscribed");
    } catch {
      setState("subscribed");
    }
  }, [user]);

  return { state, subscribe, unsubscribe };
}
