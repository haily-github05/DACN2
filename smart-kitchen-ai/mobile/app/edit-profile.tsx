import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import * as FileSystem from "expo-file-system/legacy";
import {
  ArrowLeft,
  Camera,
  Check,
  Mail,
  Phone,
  Save,
  UserRound,
  UtensilsCrossed,
  ChevronRight,
} from "lucide-react-native";
import Constants from "expo-constants";
import { getCurrentUserId } from "../lib/auth";

const C = {
  orange: "#A23A00",
  accent: "#F05A0A",
  cream: "#FFF9F5",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  peach: "#FFF0E5",
};
type Profile = {
  user_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

function apiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:3000`;
  throw new Error("Chưa xác định được backend. Hãy đặt EXPO_PUBLIC_API_URL.");
}
function avatarUri(value: string | null): string | null {
  if (!value) return null;
  if (/^(file:|content:|https?:\/\/)/i.test(value)) return value;
  if (value.startsWith("/")) return `${apiBase()}${value}`;
  return null;
}
async function readJson(response: Response): Promise<any> {
  const raw = await response.text();
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error(
      `API không trả JSON (HTTP ${response.status}). Kiểm tra backend.`,
    );
  }
  if (!response.ok || body?.success !== true)
    throw new Error(body?.message || `Lỗi HTTP ${response.status}`);
  return body;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const id = Number(await getCurrentUserId());
      if (!Number.isSafeInteger(id) || id <= 0)
        throw new Error("Vui lòng đăng nhập lại.");
      const response = await fetch(`${apiBase()}/api/profile/${id}`);
      const data: Profile = (await readJson(response)).data;
      setUserId(id);
      setName(data.full_name ?? "");
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setSavedAvatar(data.avatar_url ?? null);
      setNewAvatar(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được hồ sơ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const chooseAvatar = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Quyền truy cập ảnh",
          "Vui lòng cho phép ứng dụng truy cập thư viện ảnh.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri)
        setNewAvatar(result.assets[0].uri);
    } catch (e) {
      Alert.alert(
        "Không thể chọn ảnh",
        e instanceof Error ? e.message : "Vui lòng thử lại.",
      );
    }
  };

  const save = async () => {
    if (saving || userId === null) return;
    const full_name = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (full_name.length < 2)
      return Alert.alert("Thiếu thông tin", "Họ tên cần ít nhất 2 ký tự.");
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return Alert.alert("Email không hợp lệ", "Vui lòng kiểm tra email.");
    if (trimmedPhone && !/^[0-9+\s().-]{9,20}$/.test(trimmedPhone))
      return Alert.alert(
        "Số điện thoại không hợp lệ",
        "Vui lòng kiểm tra số điện thoại.",
      );

    setSaving(true);
    try {
      // Lưu thông tin chữ trước; nếu upload ảnh lỗi, vẫn giữ được thông tin đã lưu.
      const response = await fetch(`${apiBase()}/api/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name,
          email: trimmedEmail || null,
          phone: trimmedPhone || null,
        }),
      });
      await readJson(response);

      if (newAvatar) {
        console.log("Bắt đầu upload ảnh:", newAvatar);

        const uploadResult = await FileSystem.uploadAsync(
          `${apiBase()}/api/profile/${userId}/avatar`,
          newAvatar,
          {
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: "avatar",
            mimeType: "image/jpeg",
            parameters: {},
          },
        );

        console.log("Upload status:", uploadResult.status);
        console.log("Upload response:", uploadResult.body);

        let result: any;

        try {
          result = JSON.parse(uploadResult.body);
        } catch {
          throw new Error("Backend không trả về JSON hợp lệ.");
        }

        if (
          uploadResult.status < 200 ||
          uploadResult.status >= 300 ||
          !result.success
        ) {
          throw new Error(
            result.message || `Upload thất bại: HTTP ${uploadResult.status}`,
          );
        }

        const avatarUrl = result.avatar_url ?? result.data?.avatar_url;

        if (!avatarUrl) {
          throw new Error("Backend chưa trả về đường dẫn ảnh đại diện.");
        }

        setSavedAvatar(avatarUrl);
        setNewAvatar(null);

        console.log("Đã lưu ảnh thành công:", avatarUrl);
      }
      Alert.alert("Thành công", "Đã lưu thông tin cá nhân.", [
        { text: "OK", onPress: () => router.replace("/profile") },
      ]);
    } catch (e) {
      Alert.alert(
        "Chưa lưu đầy đủ",
        e instanceof Error ? e.message : "Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarUri(newAvatar ?? savedAvatar);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "SK";

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <AppHeader showNotification unreadCount={3} />
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={() => router.back()}
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft size={22} color={C.dark} />
        </Pressable>
        <Text style={styles.headerTitle}>Chỉnh sửa thông tin cá nhân</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.muted}>Đang tải thông tin từ MySQL...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={load} style={styles.button}>
            <Text style={styles.buttonText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.avatarCard}>
              <Pressable
                onPress={chooseAvatar}
                style={styles.avatar}
                accessibilityLabel="Chọn ảnh đại diện"
              >
                {displayAvatar ? (
                  <Image
                    source={{ uri: displayAvatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.initials}>{initials}</Text>
                )}
                <View style={styles.camera}>
                  <Camera size={16} color={C.white} />
                </View>
              </Pressable>
              <Text style={styles.avatarTitle}>Ảnh đại diện</Text>
              <Text style={styles.muted}>
                Nhấn vào ảnh để chọn ảnh mới từ thư viện
              </Text>
              {newAvatar ? (
                <Text style={styles.selected}>
                  <Check size={14} color="#28734E" /> Ảnh mới sẽ được lưu khi
                  nhấn Cập nhật
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
              <Text style={styles.muted}>
                Thông tin hiện tại được lấy từ tài khoản đã đăng nhập.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>
                  <UserRound size={15} color={C.orange} /> Họ và tên *
                </Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="#A5958C"
                  autoCapitalize="words"
                  maxLength={100}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>
                  <Mail size={15} color={C.orange} /> Email
                </Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Nhập email"
                  placeholderTextColor="#A5958C"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={254}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>
                  <Phone size={15} color={C.orange} /> Số điện thoại
                </Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#A5958C"
                  keyboardType="phone-pad"
                  maxLength={20}
                />
              </View>
              <Text style={styles.note}>
                Nếu số điện thoại dùng để đăng nhập, việc thay đổi có thể ảnh
                hưởng đến lần đăng nhập sau.
              </Text>
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              style={[styles.button, saving && styles.disabled]}
              disabled={saving}
              onPress={save}
            >
              {saving ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Save size={19} color={C.white} />
                  <Text style={styles.buttonText}>Cập nhật thông tin</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  header: {
    height: 60,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.peach,
  },
  headerTitle: { fontSize: 15, fontWeight: "800", color: C.dark },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },
  content: { padding: 18, gap: 17, paddingBottom: 28 },
  avatarCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  avatarImage: { width: 94, height: 94, borderRadius: 47 },
  initials: { fontSize: 30, fontWeight: "800", color: C.orange },
  camera: {
    position: "absolute",
    right: -2,
    bottom: -1,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.white,
  },
  avatarTitle: { fontSize: 16, fontWeight: "800", color: C.dark },
  muted: { fontSize: 12, color: C.muted, lineHeight: 19, textAlign: "center" },
  selected: { color: "#28734E", fontSize: 12, marginTop: 5 },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 4,
  },
  field: { marginTop: 19 },
  label: { fontSize: 13, fontWeight: "700", color: C.dark, marginBottom: 9 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cream,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: C.dark,
  },
  note: { marginTop: 16, color: C.muted, fontSize: 11, lineHeight: 17 },

  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  button: {
    minHeight: 52,
    backgroundColor: C.accent,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 16,
  },
  buttonText: { color: C.white, fontWeight: "800", fontSize: 14 },
  disabled: { opacity: 0.6 },
  error: { color: "#C34237", fontSize: 13, textAlign: "center" },
});
