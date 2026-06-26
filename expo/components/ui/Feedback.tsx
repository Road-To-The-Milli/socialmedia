import React from "react";
import { ActivityIndicator, StyleProp, View, ViewStyle } from "react-native";
import { colors, spacing } from "@/constants/theme";
import { AppText } from "./Text";
import { Button } from "./Button";
import { FadeIn } from "./motion";

export function Loader({ label, style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl }, style]}>
      <ActivityIndicator color={colors.primary} />
      {label ? <AppText variant="bodyMuted">{label}</AppText> : null}
    </View>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, style }: EmptyStateProps) {
  return (
    <FadeIn style={style}>
      <View style={{ alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl }}>
        {icon ? (
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.sm,
            }}
          >
            {icon}
          </View>
        ) : null}
        <AppText variant="h3" center>{title}</AppText>
        {subtitle ? (
          <AppText variant="bodyMuted" center style={{ maxWidth: 300 }}>
            {subtitle}
          </AppText>
        ) : null}
        {actionLabel && onAction ? (
          <Button title={actionLabel} onPress={onAction} variant="primary" size="md" style={{ marginTop: spacing.md }} />
        ) : null}
      </View>
    </FadeIn>
  );
}
