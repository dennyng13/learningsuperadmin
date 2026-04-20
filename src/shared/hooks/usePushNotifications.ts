import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@shared/hooks/useAuth";

const VAPID_PUBLIC_KEY = "BA0hQTt5z3dbVj6YwTLjDF-Ecwe_2ZW26EN7xPzOiECYGOq7hfsWf5l8dX4kHJe0CmZlLXVd21OEMkbI8OIYy1s";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationHours, setNotificationHours] = useState<number[]>([8, 17, 21]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const isSupported = typeof Notification !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  // Load settings
  useEffect(() => {
    if (!user) return;
    (async () => {
      setSettingsLoading(true);
      const { data } = await supabase
        .from("user_settings")
        .select("notification_hours, notifications_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setNotificationHours((data as any).notification_hours ?? [8, 17, 21]);
        setNotificationsEnabled(data.notifications_enabled ?? false);
      }
      setSettingsLoading(false);
    })();
  }, [user]);

  // Check existing subscription
  useEffect(() => {
    if (!isSupported || !user) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } catch {
        setIsSubscribed(false);
      }
    })();
  }, [user, isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { setLoading(false); return false; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const keys = sub.toJSON();
      await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: keys.keys!.p256dh,
        auth: keys.keys!.auth,
      }, { onConflict: "user_id,endpoint" });

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch {
      setLoading(false);
      return false;
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", sub.endpoint);
      }
      setIsSubscribed(false);
    } catch { /* ignore */ }
    setLoading(false);
  }, [user, isSupported]);

  const saveSettings = useCallback(async (enabled: boolean, hours: number[]) => {
    if (!user) return;

    if (enabled && !isSubscribed) {
      const ok = await subscribe();
      if (!ok) return;
    }

    if (!enabled && isSubscribed) {
      await unsubscribe();
    }

    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const updateData = {
      notifications_enabled: enabled,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("user_settings").update(updateData).eq("user_id", user.id);
    } else {
      await supabase.from("user_settings").insert({
        user_id: user.id,
        ...updateData,
      });
    }

    // Update notification_hours via raw rpc since it's not in generated types yet
    await supabase.rpc("has_role" as any, {} as any).then(() => {});
    // Use direct fetch for the array column
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const session = (await supabase.auth.getSession()).data.session;
    if (session) {
      await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${session.access_token}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ notification_hours: hours }),
      });
    }
    setNotificationHours(hours);
  }, [user, isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    notificationHours,
    notificationsEnabled,
    settingsLoading,
    subscribe,
    unsubscribe,
    saveSettings,
  };
}
