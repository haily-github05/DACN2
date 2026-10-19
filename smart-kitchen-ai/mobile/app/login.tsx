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
import {
  ArrowLeft,
  ChefHat,
  CircleHelp,
  Sparkles,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
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

export default function LoginScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const validPhone = () =>
    /^(0[35789]\d{8}|[35789]\d{8})$/.test(phone.replace(/\s/g, ""));

  const submit = () => {
    if (!validPhone()) {
      Alert.alert("Thông báo", "Vui lòng nhập số điện thoại hợp lệ.");
      return;
    }

    if (mode === "otp") {
      if (!otpSent) {
        Alert.alert(
          "Chưa kết nối OTP",
          "Cần tích hợp Firebase Phone Authentication hoặc dịch vụ OTP để gửi mã thật.",
        );
        return;
      }

      if (!/^\d{6}$/.test(otp)) {
        Alert.alert("Thông báo", "Vui lòng nhập mã OTP gồm 6 chữ số.");
        return;
      }

      Alert.alert("Thông báo", "Cần xác minh OTP với máy chủ.");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập mật khẩu.");
      return;
    }

    Alert.alert(
      "Thông tin hợp lệ",
      "Cần kết nối backend để xác thực tài khoản và đăng nhập.",
    );
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
        <Pressable style={s.back} onPress={() => router.back()}>
          <ArrowLeft size={22} color={C.orange} />
        </Pressable>

        <View style={s.badge}>
          <Sparkles size={16} color={C.orange} />
          <Text style={s.badgeText}>Trợ lý đầu bếp AI</Text>
        </View>

        <Text style={s.title}>Chào mừng trở lại!</Text>
        <Text style={s.subtitle}>
          Đăng nhập để tiếp tục hành trình ẩm thực của bạn
        </Text>

        <Pressable
          style={s.google}
          onPress={() =>
            Alert.alert(
              "Google",
              "Chức năng đăng nhập Google sẽ được kết nối sau.",
            )
          }
        >
          <Text style={s.googleLogo}>G</Text>
          <Text style={s.googleText}>Tiếp tục với Google</Text>
        </Pressable>

        <View style={s.dividerRow}>
          <View style={s.divider} />
          <Text style={s.dividerText}>Hoặc đăng nhập với số điện thoại</Text>
          <View style={s.divider} />
        </View>

        <View style={s.tabs}>
          <Pressable
            style={[s.tab, mode === "password" && s.activeTab]}
            onPress={() => setMode("password")}
          >
            <Text style={[s.tabText, mode === "password" && s.activeTabText]}>
              Mật khẩu
            </Text>
          </Pressable>

          <Pressable
            style={[s.tab, mode === "otp" && s.activeTab]}
            onPress={() => setMode("otp")}
          >
            <Text style={[s.tabText, mode === "otp" && s.activeTabText]}>
              Mã OTP
            </Text>
          </Pressable>
        </View>

        <Text style={s.label}>Số điện thoại</Text>
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
            onChangeText={(value) => {
              setPhone(value);
              setOtpSent(false);
              setOtp("");
            }}
          />
        </View>

        {mode === "password" ? (
          <>
            <View style={s.labelRow}>
              <Text style={s.label}>Mật khẩu</Text>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Quên mật khẩu",
                    "Chức năng đặt lại mật khẩu sẽ được xây dựng ở bước xác thực.",
                  )
                }
              >
                <Text style={s.forgot}>Quên mật khẩu?</Text>
              </Pressable>
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
          </>
        ) : (
          <>
            <Text style={s.label}>Mã OTP</Text>
            <View style={s.inputRow}>
              <LockKeyhole size={19} color={C.muted} />
              <TextInput
                style={s.input}
                placeholder="Nhập mã OTP 6 số"
                placeholderTextColor="#B9A59B"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
            </View>
            <Pressable
              style={s.sendOtp}
              onPress={() => {
                if (!validPhone()) {
                  Alert.alert("Thông báo", "Nhập số điện thoại hợp lệ trước.");
                  return;
                }
                Alert.alert(
                  "Chưa kết nối dịch vụ",
                  "Chức năng gửi mã OTP cần tích hợp Firebase.",
                );
              }}
            >
              <Text style={s.sendOtpText}>Gửi mã OTP</Text>
            </Pressable>
          </>
        )}

        <Pressable style={s.rememberRow} onPress={() => setRemember(!remember)}>
          <View style={[s.checkbox, remember && s.checked]}>
            {remember && <Text style={s.checkMark}>✓</Text>}
          </View>
          <Text style={s.rememberText}>Ghi nhớ phiên đăng nhập</Text>
        </Pressable>

        <Pressable style={s.primary} onPress={submit}>
          <Text style={s.primaryText}>
            {mode === "password" ? "Đăng nhập" : "Xác nhận OTP"}
          </Text>
          <ArrowRight size={19} color={C.white} />
        </Pressable>

        <View style={s.security}>
          <ShieldCheck size={25} color={C.orange} />
          <Text style={s.securityText}>
            Thông tin của bạn được mã hóa an toàn.
            {"\n"}Dễ dàng đồng bộ lịch trình ăn uống và thực đơn thông minh trên
            mọi thiết bị.
          </Text>
        </View>

        <View style={s.bottom}>
          <Text style={s.bottomText}>Chưa có tài khoản? </Text>
          <Pressable onPress={() => router.replace("/register")}>
            <Text style={s.link}>Đăng ký ngay</Text>
          </Pressable>
        </View>

        <Text style={s.terms}>
          Bằng việc đăng nhập, bạn đồng ý với Điều khoản dịch vụ & Chính sách
          bảo mật của AI FOOD.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
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
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  brand: { color: C.orange, fontSize: 17, fontWeight: "800" },
  content: { paddingHorizontal: 26, paddingBottom: 40 },
  back: {
    marginTop: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    marginBottom: 12,
  },
  badgeText: { fontSize: 12, color: C.orange, fontWeight: "700" },
  title: { fontSize: 27, fontWeight: "800", color: C.dark },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  google: {
    height: 53,
    marginTop: 25,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleLogo: { fontSize: 22, fontWeight: "800", color: "#4285F4" },
  googleText: { fontSize: 14, fontWeight: "700", color: C.dark },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginVertical: 22,
  },
  divider: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 11, color: C.muted },
  tabs: {
    height: 48,
    backgroundColor: C.peach,
    borderRadius: 12,
    flexDirection: "row",
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 9,
  },
  activeTab: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabText: { fontSize: 13, color: C.muted, fontWeight: "600" },
  activeTabText: { color: C.orange, fontWeight: "800" },
  label: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 9,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
  },
  forgot: { color: C.orange, fontSize: 12, fontWeight: "700" },
  inputRow: {
    minHeight: 54,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    marginBottom: 13,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: C.dark,
    paddingVertical: 12,
  },
  flag: { fontSize: 21 },
  prefix: { color: C.dark, fontWeight: "600", fontSize: 14 },
  verticalLine: { width: 1, height: 22, backgroundColor: C.border },
  sendOtp: { alignSelf: "flex-end", marginBottom: 10 },
  sendOtpText: { color: C.orange, fontSize: 13, fontWeight: "700" },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 8,
    marginBottom: 23,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: C.orange },
  checkMark: { color: C.white, fontWeight: "800" },
  rememberText: { fontSize: 12, color: C.muted },
  primary: {
    height: 54,
    borderRadius: 13,
    backgroundColor: C.orange,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: C.white,
  },
  security: {
    marginTop: 28,
    backgroundColor: C.peach,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    color: C.muted,
    textAlign: "center",
  },
  bottom: {
    marginTop: 39,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomText: { fontSize: 13, color: C.muted },
  link: { color: C.orange, fontSize: 13, fontWeight: "800" },
  terms: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 32,
  },
});
