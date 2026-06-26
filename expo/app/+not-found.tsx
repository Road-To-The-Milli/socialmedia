import { Link, Stack } from "expo-router";
import { Clapperboard } from "lucide-react-native";
import { View } from "react-native";
import { Screen } from "@/components/ui/Card";
import { AppText } from "@/components/ui/Text";
import { colors, spacing } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl }}>
          <Clapperboard size={48} color={colors.primary} />
          <AppText variant="title" center>Page introuvable</AppText>
          <AppText variant="bodyMuted" center>Cette scène n&apos;existe pas (encore).</AppText>
          <Link href="/" style={{ marginTop: spacing.md }}>
            <AppText style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>Retour à l&apos;accueil</AppText>
          </Link>
        </View>
      </Screen>
    </>
  );
}
