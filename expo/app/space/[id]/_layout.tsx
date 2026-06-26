import { Tabs } from "expo-router";
import { Clapperboard, Home, Lightbulb, Sparkles, Users } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import { colors } from "@/constants/theme";

export default function SpaceTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600", letterSpacing: 0.1 },
        tabBarItemStyle: { paddingTop: 2 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Accueil", tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="episodes"
        options={{ title: "Épisodes", tabBarIcon: ({ color, size }) => <Clapperboard size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="ideas"
        options={{ title: "Idées", tabBarIcon: ({ color, size }) => <Lightbulb size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="recap"
        options={{ title: "Bilan", tabBarIcon: ({ color, size }) => <Sparkles size={size - 2} color={color} /> }}
      />
      <Tabs.Screen
        name="members"
        options={{ title: "Membres", tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} /> }}
      />
    </Tabs>
  );
}
