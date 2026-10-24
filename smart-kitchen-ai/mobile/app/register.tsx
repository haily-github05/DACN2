import React, { useState } from "react";
import AppHeader from "../components/AppHeader";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { registerWithApi } from "../lib/api";
import {
  ArrowLeft,
  ChefHat,
  CircleHelp,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  Phone,
  CheckCircle2,
  Sparkles,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  white: "#FFFFFF",
};

export default function RegisterScreen() {
  const router = useRouter();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/intro");
    }
  };

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strong =
    password.length >= 8 &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const validateRegistration = () => {
    if (isSubmitting) return;
    const normalizedPhone = phone.replace(/\s/g, "");

    if (!/^(0[35789]\d{8}|[35789]\d{8})$/.test(normalizedPhone)) {
      Alert.alert("Thông báo", "Vui lòng nhập số điện thoại Việt Nam hợp lệ.");
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert("Thông báo", "Vui lòng nhập họ và tên.");
      return;
    }

    if (!strong) {
      Alert.alert(
        "Mật khẩu chưa đủ mạnh",
        "Cần ít nhất 8 ký tự, gồm số và ký tự đặc biệt.",
      );
      return;
    }

    if (password !== confirm) {
      Alert.alert("Thông báo", "Mật khẩu nhập lại không khớp.");
      return;
    }

    if (!agree) {
      Alert.alert("Thông báo", "Bạn cần đồng ý với điều khoản dịch vụ.");
      return;
    }

    Alert.alert(
      "Thông tin hợp lệ",
      "Giao diện đăng ký đã kiểm tra thành công. Cần kết nối backend để tạo tài khoản thực tế.",
    );
  };

  const submitRegistration = async () => {
    if (isSubmitting) return;
    const normalizedPhone = phone.replace(/\s/g, "");
    if (
      !/^(0[35789]\d{8}|[35789]\d{8})$/.test(normalizedPhone) ||
      name.trim().length < 2 ||
      !strong ||
      password !== confirm ||
      !agree
    ) {
      validateRegistration();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerWithApi({
        full_name: name.trim(),
        phone: normalizedPhone.startsWith("0")
          ? normalizedPhone
          : `0${normalizedPhone}`,
        password,
      });

      const user = (
        result as {
          data?: {
            user_id: number;
            full_name: string;
            phone: string;
          };
        }
      ).data;

      if (!user?.user_id) {
        throw new Error(
          "Đã tạo tài khoản nhưng backend chưa trả về user_id. " +
            "Cần kiểm tra API đăng ký.",
        );
      }

      await AsyncStorage.setItem("authUser", JSON.stringify(user));

      setPhone("");
      setName("");
      setPassword("");
      setConfirm("");
      setAgree(false);
      setShowPassword(false);
      setShowConfirm(false);

      if (Platform.OS === "web") {
        router.replace("/onboarding-preferences");
      } else {
        Alert.alert(
          "Đăng ký thành công",
          "Hãy thiết lập khẩu vị cá nhân để Smart Kitchen AI gợi ý món ăn phù hợp.",
          [
            {
              text: "Thiết lập ngay",
              onPress: () => router.replace("/onboarding-preferences"),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert(
        "Không thể đăng ký",
        error instanceof Error
          ? `${error.message}\n\nKiểm tra backend đang chạy, MySQL đã bật và iPhone cùng Wi-Fi với máy tính.`
          : "Không kết nối được máy chủ. Hãy kiểm tra backend và kết nối mạng.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppHeader />

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={s.back} onPress={goBack}>
          <ArrowLeft size={22} color={C.orange} />
        </Pressable>

        <View style={s.badge}>
          <Sparkles size={15} color={C.orange} />
          <Text style={s.badgeText}>Bếp trưởng AI đồng hành cùng bạn</Text>
        </View>

        <Text style={s.title}>Tạo tài khoản mới</Text>
        <Text style={s.subtitle}>
          Gia nhập cộng đồng ẩm thực SMART KITCHEN AI & nhận voucher chào mừng
          50.000đ
        </Text>

        <Pressable
          style={s.google}
          onPress={() =>
            Alert.alert(
              "Google",
              "Chức năng đăng ký Google sẽ được kết nối sau.",
            )
          }
        >
          <Text style={s.googleLogo}>G</Text>
          <Text style={s.googleText}>Đăng ký nhanh với Google</Text>
        </Pressable>

        <View style={s.dividerRow}>
          <View style={s.divider} />
          <Text style={s.dividerText}>Hoặc</Text>
          <View style={s.divider} />
        </View>

        <Text style={s.label}>Số điện thoại di động *</Text>
        <View style={s.inputRow}>
          <Text style={s.flag}>🇻🇳</Text>
          <Text style={s.prefix}>+84</Text>
          <View style={s.verticalLine} />
          <TextInput
            style={s.input}
            placeholder="0912 345 678"
            placeholderTextColor="#B9A59B"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
          />
          <Phone size={18} color={C.muted} />
        </View>

        <Text style={s.label}>Họ và tên của bạn *</Text>
        <View style={s.inputRow}>
          <UserRound size={19} color={C.muted} />
          <TextInput
            style={s.input}
            placeholder="Ví dụ: Nguyễn Văn An"
            placeholderTextColor="#B9A59B"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={s.labelRow}>
          <Text style={s.label}>Mật khẩu *</Text>
          <Text style={s.hint}>Tối thiểu 8 ký tự</Text>
        </View>
        <View style={s.inputRow}>
          <LockKeyhole size={19} color={C.muted} />
          <TextInput
            style={s.input}
            placeholder="Nhập mật khẩu"
            placeholderTextColor="#B9A59B"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff size={19} color={C.muted} />
            ) : (
              <Eye size={19} color={C.muted} />
            )}
          </Pressable>
        </View>

        <View style={s.passwordTips}>
          <View style={s.tip}>
            <CheckCircle2 size={16} color={strong ? "#39845A" : C.muted} />
            <Text style={s.tipText}>Mật khẩu mạnh</Text>
          </View>
          <View style={s.tip}>
            <CheckCircle2 size={16} color={strong ? "#39845A" : C.muted} />
            <Text style={s.tipText}>Số & ký tự đặc biệt</Text>
          </View>
        </View>

        <Text style={s.label}>Nhập lại mật khẩu *</Text>
        <View style={s.inputRow}>
          <LockKeyhole size={19} color={C.muted} />
          <TextInput
            style={s.input}
            placeholder="Nhập lại mật khẩu của bạn"
            placeholderTextColor="#B9A59B"
            secureTextEntry={!showConfirm}
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowConfirm(!showConfirm)}>
            {showConfirm ? (
              <EyeOff size={19} color={C.muted} />
            ) : (
              <Eye size={19} color={C.muted} />
            )}
          </Pressable>
        </View>

        <Pressable style={s.agreeRow} onPress={() => setAgree(!agree)}>
          <View style={[s.checkbox, agree && s.checked]}>
            {agree && <Text style={s.checkMark}>✓</Text>}
          </View>
          <Text style={s.agreeText}>
            Tôi đồng ý với <Text style={s.link}>Điều khoản dịch vụ</Text> và{" "}
            <Text style={s.link}>Chính sách bảo mật</Text> của AI FOOD.
          </Text>
        </Pressable>

        <Pressable
          style={s.primary}
          onPress={submitRegistration}
          disabled={isSubmitting}
        >
          <Text style={s.primaryText}>
            {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </Text>
        </Pressable>

        <View style={s.bottom}>
          <Text style={s.bottomText}>Đã có tài khoản? </Text>
          <Pressable onPress={() => router.replace("/login")}>
            <Text style={s.link}>Đăng nhập ngay</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  header: {
    height: 55,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  brand: { color: C.orange, fontSize: 17, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingBottom: 45 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    marginBottom: 12,
  },
  badgeText: { fontSize: 12, color: C.orange, fontWeight: "600" },
  title: { fontSize: 27, fontWeight: "800", color: C.dark },
  subtitle: {
    fontSize: 13,
    lineHeight: 21,
    color: C.muted,
    marginTop: 9,
  },
  google: {
    height: 52,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 24,
  },
  googleLogo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4285F4",
  },
  googleText: { fontSize: 14, fontWeight: "700", color: C.dark },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 21,
  },
  divider: { height: 1, backgroundColor: C.border, flex: 1 },
  dividerText: { color: C.muted, fontSize: 12 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 9,
    marginTop: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  hint: { color: C.muted, fontSize: 11 },
  inputRow: {
    minHeight: 53,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.dark,
    paddingVertical: 12,
    minWidth: 0,
  },
  flag: { fontSize: 21 },
  prefix: { fontSize: 14, color: C.dark, fontWeight: "600" },
  verticalLine: { width: 1, height: 22, backgroundColor: C.border },
  passwordTips: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 6,
  },
  tip: { flexDirection: "row", alignItems: "center", gap: 5 },
  tipText: { color: C.muted, fontSize: 11 },
  agreeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 13,
    marginBottom: 22,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderWidth: 1.5,
    borderColor: C.orange,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  checked: { backgroundColor: C.orange },
  checkMark: { color: C.white, fontWeight: "800" },
  agreeText: {
    flex: 1,
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  link: { color: C.orange, fontWeight: "700", fontSize: 13 },
  primary: {
    height: 54,
    backgroundColor: C.orange,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  bottomText: { color: C.muted, fontSize: 13 },
});
