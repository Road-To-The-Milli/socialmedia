import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View } from "react-native";
import { colors, shadows } from "@/constants/theme";
import { AppText } from "@/components/ui/Text";

export function BrandMark({ size = 64, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          overflow: "hidden",
        },
        glow ? shadows.glow : null,
      ]}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", borderRadius: size * 0.3 }}
      >
        <AppText
          style={{
            fontSize: size * 0.56,
            lineHeight: size * 0.64,
            fontWeight: "900",
            letterSpacing: -1,
            color: colors.white,
          }}
        >
          G
        </AppText>
      </LinearGradient>
    </View>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <AppText style={{ fontSize: size, fontWeight: "800", letterSpacing: -0.8, color: colors.text }}>
      Gather
    </AppText>
  );
}
