import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";
import { colors } from "@/constants/theme";
import { Profile } from "@/lib/types";
import { AppText } from "./Text";

const AVATAR_COLORS = ["#EF233C", "#CDBE57", "#3DD27E", "#5B8DEF", "#B05BEF", "#EF8C5B", "#3DC9D2"];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  profile?: Profile | null;
  name?: string | null;
  uri?: string | null;
  size?: number;
  ring?: boolean;
}

export function Avatar({ profile, name, uri, size = 44, ring = false }: AvatarProps) {
  const displayName = profile?.name ?? name ?? null;
  const imageUri = uri ?? profile?.avatar_url ?? null;
  const bg = AVATAR_COLORS[hashString(displayName ?? "?") % AVATAR_COLORS.length];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: ring ? 2 : 0,
        borderColor: colors.bg,
        overflow: "hidden",
      }}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: size, height: size }} contentFit="cover" transition={200} />
      ) : (
        <AppText style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.38 }}>{initials(displayName)}</AppText>
      )}
    </View>
  );
}

export function AvatarStack({ profiles, size = 30, max = 4 }: { profiles: (Profile | null | undefined)[]; size?: number; max?: number }) {
  const shown = profiles.slice(0, max);
  const extra = profiles.length - shown.length;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {shown.map((p, i) => (
        <View key={p?.id ?? i} style={{ marginLeft: i === 0 ? 0 : -size * 0.34 }}>
          <Avatar profile={p} size={size} ring />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: -size * 0.34,
            borderWidth: 2,
            borderColor: colors.bg,
          }}
        >
          <AppText style={{ color: colors.textMuted, fontWeight: "700", fontSize: size * 0.34 }}>+{extra}</AppText>
        </View>
      ) : null}
    </View>
  );
}
