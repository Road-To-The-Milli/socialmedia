import { useRouter } from "expo-router";
import { BellRing, CheckCheck, Inbox } from "lucide-react-native";
import React from "react";
import { RefreshControl, TouchableOpacity, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { Screen } from "@/components/ui/Card";
import { EmptyState, Loader } from "@/components/ui/Feedback";
import { FadeIn, PressableScale } from "@/components/ui/motion";
import { AppText } from "@/components/ui/Text";
import { colors, radius, spacing } from "@/constants/theme";
import { formatRelative } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/useNotifications";

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const hasUnread = (notifications ?? []).some((n) => !n.read_at);

  const onPress = (notification: AppNotification) => {
    if (!notification.read_at) markRead.mutate(notification.id);
    const url = notification.url;
    if (url && url.startsWith("/")) {
      try {
        router.push(url as never);
      } catch {
        // ignore unknown routes
      }
    }
  };

  return (
    <Screen scroll contentStyle={{ paddingHorizontal: spacing.lg }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
      <AppHeader
        title="Notifications"
        style={{ paddingHorizontal: 0 }}
        right={
          hasUnread ? (
            <PressableScale onPress={() => markAll.mutate()} withHaptic={false} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <CheckCheck size={16} color={colors.primary} />
              <AppText style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Tout lu</AppText>
            </PressableScale>
          ) : undefined
        }
      />

      {isLoading ? (
        <Loader label="Chargement…" />
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState icon={<Inbox size={30} color={colors.primary} />} title="Rien de neuf" subtitle="Les nouveautés de tes espaces (épisodes, commentaires, idées, déverrouillages) apparaîtront ici." />
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {notifications.map((n, i) => {
            const unread = !n.read_at;
            return (
              <FadeIn key={n.id} delay={i * 35}>
                <PressableScale
                  onPress={() => onPress(n)}
                  scaleTo={0.98}
                  style={{ flexDirection: "row", gap: spacing.md, backgroundColor: unread ? colors.cardElevated : colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: unread ? colors.borderStrong : colors.border, padding: spacing.md }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: unread ? colors.primarySoft : colors.surface, alignItems: "center", justifyContent: "center" }}>
                    <BellRing size={18} color={unread ? colors.primary : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    {n.title ? <AppText style={{ fontWeight: "700", fontSize: 14.5, color: colors.text }} numberOfLines={1}>{n.title}</AppText> : null}
                    {n.body ? <AppText variant="bodyMuted" numberOfLines={2}>{n.body}</AppText> : null}
                    <AppText variant="caption" style={{ marginTop: 2 }}>{formatRelative(n.created_at)}</AppText>
                  </View>
                  {unread ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 }} /> : null}
                </PressableScale>
              </FadeIn>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
