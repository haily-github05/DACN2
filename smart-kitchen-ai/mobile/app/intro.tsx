import React from "react";
import AppHeader from "../components/AppHeader";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Image,
} from "react-native";

import { useRouter } from "expo-router";

import {
  ArrowLeft,
  CircleHelp,
  Camera,
  ChefHat,
  Sparkles,
  BookOpen,
  CheckCircle2,
  UserRound,
  ArrowRight,
} from "lucide-react-native";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  border: "#EED9CF",
  dark: "#201A17",
  muted: "#735A51",
  white: "#FFFFFF",
};

export default function IntroScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* BACK BUTTON */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={C.orange} />
        </Pressable>

        {/* HERO IMAGE */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Sparkles size={15} color={C.orange} />

            <Text style={styles.heroBadgeText}>Trợ lý Ẩm thực Thông minh</Text>
          </View>

          <Image
            source={require("../assets/intro-food.png")}
            style={styles.foodImage}
            resizeMode="cover"
          />

          <View style={styles.heroTags}>
            <View style={styles.tag}>
              <Camera size={14} color={C.orange} />

              <Text style={styles.tagText}>Quét nguyên liệu AI</Text>
            </View>

            <View style={styles.tag}>
              <ChefHat size={14} color={C.orange} />

              <Text style={styles.tagText}>Chuẩn vị Việt & Quốc tế</Text>
            </View>
          </View>
        </View>

        {/* TITLE */}
        <Text style={styles.title}>
          Chào mừng bạn đến với{" "}
          <Text style={styles.titleOrange}>SMART KITCHEN AI</Text>
        </Text>

        {/* DESCRIPTION */}
        <Text style={styles.description}>
          Người bạn đồng hành vào bếp giúp biến mọi nguyên liệu trong tủ lạnh
          thành món ngon chuẩn vị chỉ với một chạm chụp ảnh và gợi ý thông minh
          từ AI.
        </Text>

        {/* FEATURES */}
        <View style={styles.featureGrid}>
          <View style={styles.feature}>
            <BookOpen size={23} color={C.orange} />

            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>10.000+ Công thức</Text>

              <Text style={styles.featureSub}>Chi tiết từng bước nấu</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Sparkles size={23} color={C.orange} />

            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Gợi ý Chuẩn vị AI</Text>

              <Text style={styles.featureSub}>Cá nhân hoá khẩu vị</Text>
            </View>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actions}>
          {/* LOGIN */}
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/login")}
          >
            <UserRound size={19} color={C.white} />

            <Text style={styles.primaryText}>Đăng nhập</Text>

            <ArrowRight size={18} color={C.white} />
          </Pressable>

          {/* REGISTER */}
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.secondaryText}>
              Tạo tài khoản mới / Đăng ký
            </Text>
          </Pressable>

          {/* GUEST */}
          <Pressable
            style={styles.guestButton}
            onPress={() => router.push("/home")}
          >
            <CheckCircle2 size={17} color={C.orange} />

            <Text style={styles.guestText}>
              Trải nghiệm ngay không cần tài khoản
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },

  scroll: {
    flex: 1,
  },

  // HEADER
  header: {
    height: 55,
    backgroundColor: C.white,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  brand: {
    fontSize: 17,
    fontWeight: "800",
    color: C.orange,
  },

  help: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: C.peach,
  },

  content: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },

  // BACK BUTTON
  backButton: {
    marginTop: 12,
    width: 40,
    height: 40,
    backgroundColor: C.peach,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // HERO
  hero: {
    marginTop: 5,
    height: 255,
    alignItems: "center",
    justifyContent: "center",
  },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.peach,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 12,
  },

  heroBadgeText: {
    color: C.orange,
    fontSize: 11,
    fontWeight: "700",
  },

  // IMAGE
  foodImage: {
    width: "100%",
    height: 195,
    borderRadius: 18,
  },

  heroTags: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },

  tagText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "600",
  },

  // TITLE
  title: {
    marginTop: 22,
    fontSize: 23,
    lineHeight: 31,
    fontWeight: "800",
    color: C.dark,
    textAlign: "center",
  },

  titleOrange: {
    color: C.orange,
  },

  description: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    color: C.muted,
  },

  // FEATURES
  featureGrid: {
    marginTop: 23,
    flexDirection: "row",
    gap: 10,
  },

  feature: {
    flex: 1,
    minHeight: 100,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  featureText: {
    alignItems: "center",
  },

  featureTitle: {
    color: C.dark,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },

  featureSub: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 4,
  },

  // ACTIONS
  actions: {
    marginTop: 29,
    gap: 12,
  },

  primaryButton: {
    height: 53,
    backgroundColor: C.orange,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  primaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.white,
  },

  secondaryButton: {
    height: 51,
    borderWidth: 1.5,
    borderColor: C.orange,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  secondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.orange,
  },

  guestButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  guestText: {
    fontSize: 12,
    color: C.orange,
    fontWeight: "600",
  },
});
