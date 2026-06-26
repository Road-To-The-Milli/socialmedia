import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, Platform, Pressable, TextInput, View } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";
import { formatDate } from "@/lib/format";
import { Button } from "./Button";
import { Field } from "./Input";
import { PressableScale } from "./motion";
import { AppText } from "./Text";

interface Props {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  placeholder?: string;
}

const fieldRow = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 10,
  backgroundColor: colors.bgElevated,
  borderRadius: radius.md,
  borderWidth: 1.5,
  borderColor: colors.border,
  paddingHorizontal: spacing.md,
  minHeight: 50,
};

export function DateField({ label, value, onChange, minimumDate, placeholder = "Choisir une date" }: Props) {
  const [show, setShow] = useState<boolean>(false);
  const [temp, setTemp] = useState<Date>(value ?? new Date());

  if (Platform.OS === "web") {
    return (
      <Field label={label}>
        <View style={fieldRow}>
          <Calendar size={18} color={colors.textFaint} />
          <TextInput
            placeholder="AAAA-MM-JJ"
            placeholderTextColor={colors.textFaint}
            defaultValue={value ? value.toISOString().slice(0, 10) : ""}
            onChangeText={(t) => {
              const d = new Date(t);
              if (!isNaN(d.getTime())) onChange(d);
            }}
            style={{ flex: 1, color: colors.text, fontSize: 15.5, fontWeight: "500", paddingVertical: 14 }}
          />
        </View>
      </Field>
    );
  }

  return (
    <Field label={label}>
      <PressableScale
        onPress={() => {
          setTemp(value ?? new Date());
          setShow(true);
        }}
        scaleTo={0.98}
        style={fieldRow}
      >
        <Calendar size={18} color={colors.textFaint} />
        <AppText style={{ flex: 1, color: value ? colors.text : colors.textFaint, fontSize: 15.5, fontWeight: "500" }}>
          {value ? formatDate(value.toISOString()) : placeholder}
        </AppText>
      </PressableScale>

      {Platform.OS === "android" && show ? (
        <DateTimePicker
          value={temp}
          mode="date"
          minimumDate={minimumDate}
          onChange={(e, d) => {
            setShow(false);
            if (e.type === "set" && d) onChange(d);
          }}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setShow(false)} />
          <View
            style={{
              backgroundColor: colors.bgElevated,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              padding: spacing.lg,
              paddingBottom: spacing.xxxl,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
              <Button title="Annuler" variant="ghost" size="sm" onPress={() => setShow(false)} />
              <AppText variant="h3">{label ?? "Date"}</AppText>
              <Button
                title="OK"
                variant="ghost"
                size="sm"
                onPress={() => {
                  onChange(temp);
                  setShow(false);
                }}
              />
            </View>
            <DateTimePicker
              value={temp}
              mode="date"
              display="spinner"
              themeVariant="dark"
              textColor={colors.text}
              minimumDate={minimumDate}
              onChange={(_e, d) => {
                if (d) setTemp(d);
              }}
              style={{ alignSelf: "stretch" }}
            />
          </View>
        </Modal>
      ) : null}
    </Field>
  );
}
