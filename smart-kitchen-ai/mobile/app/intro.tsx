// Trang: Giới thiệu ngắn gọn — nội dung vừa màn hình, không cuộn.
import { logoutUser } from "../lib/auth";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Leaf,
  Sparkles,
} from "lucide-react-native";
import AppHeader from "../components/AppHeader";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  border: "#EED9CF",
  dark: "#201A17",
  muted: "#735A51",
};
export default function IntroScreen() {
  const router = useRouter();
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 740 || fontScale > 1.2;
  const minimal = height < 620 || fontScale > 1.5;
  return (
    <SafeAreaView style={s.page} edges={["left", "right", "bottom"]}>
      <AppHeader />
      <View style={[s.content, compact && s.compactContent]}>
        <View style={s.topRow}>
          <Pressable
            accessibilityLabel="Quay lại"
            style={s.back}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          >
            <ArrowLeft size={20} color={C.orange} />
          </Pressable>
          <View style={s.badge}>
            <Sparkles size={13} color={C.orange} />
            <Text style={s.badgeText}>CĂN BẾP CỦA BẠN, THÔNG MINH HƠN</Text>
          </View>
        </View>
        {!minimal && (
          <View style={s.hero}>
            <Image
              source={require("../assets/intro-food.png")}
              style={s.image}
              resizeMode="contain"
              accessibilityLabel="Món ăn tươi ngon trong căn bếp"
            />
          </View>
        )}
        <View style={s.copy}>
          <Text style={[s.title, compact && s.compactTitle]}>
            Bếp gọn hơn.{"\n"}
            <Text style={s.orange}>Mỗi bữa ngon hơn.</Text>
          </Text>
          {!minimal && (
            <Text style={s.description}>
              Quản lý nguyên liệu, tìm món hợp khẩu vị{"\n"}và lên thực đơn mỗi
              ngày.
            </Text>
          )}
        </View>
        {!minimal && (
          <View style={s.features}>
            <View style={s.feature}>
              <Leaf size={18} color={C.orange} />
              <Text style={s.featureText}>Quản lý kho</Text>
            </View>
            <View style={s.featureDivider} />
            <View style={s.feature}>
              <BookOpen size={18} color={C.orange} />
              <Text style={s.featureText}>Gợi ý món ngon</Text>
            </View>
          </View>
        )}
        <View style={s.actions}>
          <Pressable style={s.primary} onPress={() => router.push("/login")}>
            <Text style={s.primaryText}>Đăng nhập</Text>
            <ArrowRight size={19} color="white" />
          </Pressable>
          <Pressable
            style={s.secondary}
            onPress={() => router.push("/register")}
          >
            <Text style={s.secondaryText}>Tạo tài khoản mới</Text>
          </Pressable>
          <Pressable style={s.guest} onPress={async () => { await logoutUser(); router.replace("/home"); }}>
            <CheckCircle2 size={16} color={C.orange} />
            <Text style={s.guestText}>Trải nghiệm ngay</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 16,
  },
  compactContent: { paddingTop: 8, paddingBottom: 6, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  back: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: C.orange,
    flexShrink: 1,
  },
  hero: {
    flex: 1,
    minHeight: 0,
    maxHeight: 250,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  copy: { alignItems: "center", gap: 9 },
  title: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "800",
    textAlign: "center",
    color: C.dark,
  },
  compactTitle: { fontSize: 26, lineHeight: 32 },
  orange: { color: C.orange },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: C.muted,
  },
  features: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 8,
  },
  feature: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  featureText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.muted,
    flexShrink: 1,
  },
  featureDivider: {
    width: 1,
    height: 20,
    backgroundColor: C.border,
    marginHorizontal: 6,
  },
  actions: { gap: 8, marginTop: "auto" },
  primary: {
    minHeight: 48,
    backgroundColor: C.orange,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 10,
  },
  primaryText: { fontSize: 15, fontWeight: "700", color: "white" },
  secondary: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  secondaryText: { fontSize: 13, fontWeight: "700", color: C.orange },
  guest: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  guestText: { fontSize: 12, color: C.orange, fontWeight: "600" },
});
