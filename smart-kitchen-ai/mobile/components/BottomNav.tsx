import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

import { usePathname, useRouter } from "expo-router";

import {
  House,
  Package,
  Compass,
  CalendarDays,
  UserRound,
} from "lucide-react-native";

type NavKey = "home" | "pantry" | "explore" | "meal-plan" | "profile";

const COLORS = {
  active: "#A23A00",
  inactive: "#735A51",
  white: "#FFFFFF",
  border: "#EED9CF",
};

const items = [
  {
    key: "home",
    label: "Trang chủ",
    route: "/home",
    icon: House,
  },
  {
    key: "pantry",
    label: "Kho",
    route: "/pantry",
    icon: Package,
  },
  {
    key: "explore",
    label: "Khám phá",
    route: "/explore",
    icon: Compass,
  },
  {
    key: "meal-plan",
    label: "Thực đơn",
    route: "/meal-plan",
    icon: CalendarDays,
  },
  {
    key: "profile",
    label: "Cá nhân",
    route: "/profile",
    icon: UserRound,
  },
] as const;

const pageGroups = {
  home: ['/home'],
  pantry: ['/pantry','/ingredient-detail','/add-ingredient','/ingredient-categories','/edit-ingredient','/expiring-food','/cooking-complete'],
  explore: ['/explore','/scan','/scan-result','/recipes','/recipe-detail','/ai-assistant','/recipe-filters','/cooking-steps','/community','/create-post','/post-detail'],
  'meal-plan': ['/meal-plan','/shopping-list'],
  profile: ['/profile','/preferences','/notifications'],
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const activeKey =
    (Object.keys(pageGroups) as NavKey[]).find((key) =>
      pageGroups[key].some(
        (path) => pathname === path || pathname.startsWith(path + "/"),
      ),
    ) ?? "home";

  const handleNavigate = (route: string) => {
    if (pathname === route) return;

    router.navigate(route as any);
  };

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const active = item.key === activeKey;
        const Icon = item.icon;

        return (
          <Pressable
            key={item.key}
            style={styles.item}
            onPress={() => handleNavigate(item.route)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Icon
              size={23}
              color={active ? COLORS.active : COLORS.inactive}
              strokeWidth={active ? 2.7 : 1.8}
            />

            <Text style={[styles.label, active && styles.activeLabel]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 66,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },

  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: "100%",
  },

  label: {
    fontSize: 10,
    fontWeight: "400",
    color: COLORS.inactive,
  },

  activeLabel: {
    color: COLORS.active,
    fontWeight: "800",
  },
});
