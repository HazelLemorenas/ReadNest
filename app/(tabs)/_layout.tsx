import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <TabIcon emoji="🏠" color={color} />,
          headerTitle: "ReadNest",
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarLabel: "Library",
          tabBarIcon: ({ color }) => <TabIcon emoji="📚" color={color} />,
          headerTitle: "My Library",
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Goals",
          tabBarLabel: "Goals",
          tabBarIcon: ({ color }) => <TabIcon emoji="🎯" color={color} />,
          headerTitle: "Reading Goals",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
          headerTitle: "Settings",
        }}
      />
    </Tabs>
  );
}

// Simple emoji icon component for tab bar
function TabIcon({ emoji, color }: { emoji: string; color?: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}
