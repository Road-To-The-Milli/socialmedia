import React, { useState } from "react";
import { StyleProp, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";
import { AppText } from "./Text";

interface FieldProps {
  label?: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Field({ label, error, hint, children, style }: FieldProps) {
  return (
    <View style={[{ gap: 7 }, style]}>
      {label ? <AppText variant="label" style={{ color: colors.textMuted }}>{label}</AppText> : null}
      {children}
      {error ? (
        <AppText style={{ fontSize: 12.5, color: colors.destructive, fontWeight: "600" }}>{error}</AppText>
      ) : hint ? (
        <AppText style={{ fontSize: 12.5, color: colors.textFaint }}>{hint}</AppText>
      ) : null}
    </View>
  );
}

interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
  invalid?: boolean;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({ icon, invalid, multiline, containerStyle, style, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState<boolean>(false);
  const borderColor = invalid ? colors.destructive : focused ? colors.primary : colors.border;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: 10,
          backgroundColor: colors.bgElevated,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor,
          paddingHorizontal: spacing.md,
          minHeight: multiline ? 110 : 50,
          paddingVertical: multiline ? spacing.md : 0,
        },
        containerStyle,
      ]}
    >
      {icon ? <View style={{ paddingTop: multiline ? 2 : 0 }}>{icon}</View> : null}
      <TextInput
        {...rest}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor={colors.textFaint}
        style={[
          {
            flex: 1,
            color: colors.text,
            fontSize: 15.5,
            fontWeight: "500",
            paddingVertical: multiline ? 0 : 14,
            textAlignVertical: multiline ? "top" : "center",
          },
          style,
        ]}
      />
    </View>
  );
}
