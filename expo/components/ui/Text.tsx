import React from "react";
import { Text as RNText, TextProps, TextStyle } from "react-native";
import { colors, type as typeStyles } from "@/constants/theme";

type Variant = keyof typeof typeStyles;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
  weight?: TextStyle["fontWeight"];
}

/** Canonical typographic component. Always prefer this over raw RN Text. */
export function AppText({ variant = "body", color, center, weight, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        typeStyles[variant],
        color ? { color } : null,
        center ? { textAlign: "center" } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}

export { colors };
