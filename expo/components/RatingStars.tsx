import { Star } from "lucide-react-native";
import React from "react";
import { View } from "react-native";
import { PressableScale } from "@/components/ui/motion";
import { colors } from "@/constants/theme";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  gap?: number;
}

/** Five-star rating. Read-only when onChange is omitted. */
export function RatingStars({ value, onChange, size = 22, gap = 4 }: Props) {
  return (
    <View style={{ flexDirection: "row", gap }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const node = (
          <Star
            size={size}
            color={filled ? colors.accent : colors.borderStrong}
            fill={filled ? colors.accent : "transparent"}
          />
        );
        if (!onChange) return <View key={star}>{node}</View>;
        return (
          <PressableScale key={star} onPress={() => onChange(star === value ? 0 : star)} scaleTo={0.85}>
            {node}
          </PressableScale>
        );
      })}
    </View>
  );
}
