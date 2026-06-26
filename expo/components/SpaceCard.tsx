import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Sparkles, Users } from "lucide-react-native";
import React from "react";
import { View } from "react-native";
import { Badge, RoleBadge } from "@/components/ui/Badge";
import { FadeIn, PressableScale } from "@/components/ui/motion";
import { AppText } from "@/components/ui/Text";
import { colors, radius, shadows, spacing } from "@/constants/theme";
import { getSeasonStatus } from "@/lib/format";
import { effectiveRole, type SpaceWithMembership } from "@/lib/types";

export function SpaceCard({ space, index = 0, onPress }: { space: SpaceWithMembership; index?: number; onPress: () => void }) {
  const status = getSeasonStatus(space);
  const role = effectiveRole(space.membership);

  return (
    <FadeIn delay={index * 70}>
      <PressableScale
        onPress={onPress}
        scaleTo={0.98}
        style={[
          {
            height: 190,
            borderRadius: radius.xl,
            overflow: "hidden",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          },
          shadows.poster,
        ]}
      >
        {space.cover_url ? (
          <Image source={{ uri: space.cover_url }} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" transition={250} />
        ) : (
          <LinearGradient colors={["#3A1418", "#1E1012"]} style={{ position: "absolute", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
            <AppText style={{ fontSize: 64, opacity: 0.5 }}>🎬</AppText>
          </LinearGradient>
        )}

        <LinearGradient
          colors={["rgba(8,8,9,0.05)", "rgba(8,8,9,0.45)", "rgba(8,8,9,0.92)"]}
          locations={[0, 0.5, 1]}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />

        <View style={{ position: "absolute", top: spacing.md, left: spacing.md, right: spacing.md, flexDirection: "row", justifyContent: "space-between" }}>
          {status.state === "unlocked" ? (
            <Badge label="Débloqué" tone="gold" icon={<Sparkles size={12} color={colors.accent} />} />
          ) : status.state === "ended" ? (
            <Badge label="À débloquer" tone="primary" icon={<Lock size={12} color={colors.primary} />} />
          ) : (
            <Badge label={status.label} tone={status.state === "ending" ? "primary" : "muted"} />
          )}
          <RoleBadge role={role} />
        </View>

        <View style={{ position: "absolute", bottom: spacing.md, left: spacing.md, right: spacing.md, gap: 3 }}>
          <AppText variant="h2" numberOfLines={1} style={{ color: "#fff" }}>
            {space.name}
          </AppText>
          {space.description ? (
            <AppText numberOfLines={1} style={{ color: "rgba(255,255,255,0.7)", fontSize: 13.5, fontWeight: "500" }}>
              {space.description}
            </AppText>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Users size={13} color="rgba(255,255,255,0.6)" />
              <AppText style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500" }}>Aventure partagée</AppText>
            </View>
          )}
        </View>
      </PressableScale>
    </FadeIn>
  );
}
