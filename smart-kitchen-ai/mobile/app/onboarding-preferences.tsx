import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { saveUserPreferences } from "../lib/api";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Camera,
  UserRound,
  UtensilsCrossed,
  Flame,
  MapPin,
  Wallet,
  Users,
  Clock3,
  ShieldAlert,
  Ban,
  Minus,
  Plus,
} from "lucide-react-native";
const C = {
  orange: "#A23A00",
  accent: "#F05A0A",
  cream: "#FFF9F5",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  peach: "#FFF0E5",
  gray: "#948780",
};
export const PREF_KEY = "smart-kitchen-user-preferences-v1";
type Pref = {
  avatar: string | null;
  diet: string;
  tastes: string[];
  region: string;
  budget: number;
  people: number;
  cookTime: number;
  allergies: string[];
  dislikes: string[];
  completed: boolean;
};
const DEFAULT: Pref = {
  avatar: null,
  diet: "Bình thường",
  tastes: [],
  region: "Miền Trung",
  budget: 100000,
  people: 2,
  cookTime: 30,
  allergies: [],
  dislikes: [],
  completed: false,
};
const DIETS = [
  "Bình thường",
  "Eat Clean / Healthy",
  "Low-carb / Keto",
  "Ăn chay",
];
const TASTES = [
  "🌶 Thích ăn cay",
  "🍯 Ngọt dịu",
  "🍋 Chua thanh",
  "🥗 Thanh đạm",
  "🍲 Đậm đà ",
];
const REGIONS = ["Miền Bắc", "Miền Trung", "Miền Nam"];
const ALLERGIES = [
  "🦐 Tôm, hải sản",
  "🥜 Đậu phộng / Lạc",
  "🥛 Sữa & Lactose",
  "🥚 Trứng",
  "🌾 Gluten",
  "🫘 Đậu nành",
];
const DISLIKES = [
  "🌿 Hành lá",
  "🌿 Rau mùi",
  "🥒 Khổ qua",
  "🧄 Tỏi sống",
  "🍄 Nấm",
];
const BUDGETS = [50000, 75000, 100000, 150000, 200000, 300000];
const normalize = (value: string) =>
  value.replace(/^[^\p{L}\p{N}]+/u, "").trim();
function Card({
  title,
  icon,
  note,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.titleRow}>
          {icon}
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}
function Chips({
  values,
  selected,
  onSelect,
  multi = false,
}: {
  values: string[];
  selected: string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}) {
  return (
    <View style={styles.chips}>
      {values.map((value) => {
        const key = normalize(value);
        const active = selected.includes(key);
        return (
          <Pressable
            key={value}
            onPress={() => onSelect(key)}
            style={[styles.chip, active && styles.activeChip]}
          >
            <Text style={[styles.chipText, active && styles.activeText]}>
              {value}
              {active && multi ? " ×" : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
export default function OnboardingPreferences() {
  const router = useRouter();
  const [p, setP] = useState<Pref>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moreAllergy, setMoreAllergy] = useState(false);
  const [moreDislike, setMoreDislike] = useState(false);
  const [customAllergy, setCustomAllergy] = useState("");
  const [customDislike, setCustomDislike] = useState("");
  const [avatarMenu, setAvatarMenu] = useState(false);
  useEffect(() => {
    let alive = true;
    const loadPreferences = async () => {
      try {
        const rawUser = await AsyncStorage.getItem("authUser");
        if (!rawUser) return;
        const user = JSON.parse(rawUser);
        const userId = Number(user.user_id);
        if (!Number.isSafeInteger(userId) || userId <= 0) {
          return;
        }
        const raw = await AsyncStorage.getItem(`${PREF_KEY}-${userId}`);
        if (raw && alive) {
          setP({
            ...DEFAULT,
            ...JSON.parse(raw),
          });
        }
      } catch (error) {
        console.warn("Không đọc được khẩu vị:", error);
      } finally {
        if (alive) setLoading(false);
      }
    };
    loadPreferences();
    return () => {
      alive = false;
    };
  }, []);
  const set = <K extends keyof Pref>(key: K, value: Pref[K]) => {
    setP((old) => ({
      ...old,
      [key]: value,
    }));
  };
  const toggle = (key: "tastes" | "allergies" | "dislikes", value: string) => {
    setP((old) => ({
      ...old,
      [key]: old[key].includes(value)
        ? old[key].filter((item) => item !== value)
        : [...old[key], value],
    }));
  };
  const addCustom = (key: "allergies" | "dislikes", text: string) => {
    const value = text.trim().replace(/\s+/g, " ");

    if (!value) return;

    setP((old) => ({
      ...old,
      [key]: old[key].some((item) => item.toLowerCase() === value.toLowerCase())
        ? old[key]
        : [...old[key], value],
    }));

    if (key === "allergies") {
      setCustomAllergy("");
    } else {
      setCustomDislike("");
    }
  };
  const chooseImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Cần quyền ảnh", "Hãy cấp quyền truy cập thư viện ảnh.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) {
        set("avatar", result.assets[0].uri);
      }
    } catch {
      Alert.alert("Lỗi", "Không chọn được ảnh.");
    }
  };
  const finish = async (skip = false) => {
    if (saving) return;
    setSaving(true);
    try {
      const rawUser = await AsyncStorage.getItem("authUser");
      if (!rawUser) {
        throw new Error("Chưa tìm thấy thông tin tài khoản");
      }
      const user = JSON.parse(rawUser);
      const userId = Number(user.user_id);
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new Error("Không xác định được tài khoản người dùng");
      }
      // Chỉ lưu vào MySQL khi người dùng nhấn Hoàn tất
      if (!skip) {
        await saveUserPreferences(userId, p);
      }
      // Lưu trạng thái thiết lập trên thiết bị
      await AsyncStorage.setItem(
        `${PREF_KEY}-${userId}`,
        JSON.stringify({
          ...p,
          completed: !skip,
          skipped: skip,
        }),
      );
      router.replace("/home");
    } catch (error) {
      Alert.alert(
        "Không thể hoàn tất",
        error instanceof Error ? error.message : "Có lỗi xảy ra",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={C.accent} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {/* HEADER CHUNG */}
      <AppHeader />
      {/* TIÊU ĐỀ TRANG 37 */}
      <View style={styles.pageHeading}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ArrowLeft size={20} color={C.dark} />
        </Pressable>
        <Text style={styles.pageTitle}>Thiết lập khẩu vị cá nhân</Text>
        <Pressable onPress={() => finish(true)} disabled={saving}>
          <Text style={styles.skip}>Bỏ qua</Text>
        </Pressable>
      </View>
      {/* PROGRESS */}
      <View style={styles.progress}>
        <View style={styles.progressFill} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* GIỚI THIỆU */}
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Sparkles color={C.accent} size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>
              Để Smart Kitchen AI cá nhân hóa thực đơn dành riêng cho bạn!
            </Text>
            <Text style={styles.introSub}>
              Chọn sở thích, ngân sách và thời gian để nhận gợi ý món ăn phù hợp
              mỗi ngày.
            </Text>
          </View>
        </View>
        {/* ẢNH ĐẠI DIỆN */}
        <Card
          title="Ảnh đại diện của bạn"
          icon={<UserRound color={C.accent} size={17} />}
          note="(Tùy chọn)"
        >
          <View style={styles.avatarRow}>
            <Pressable style={styles.avatar} onPress={chooseImage}>
              {p.avatar?.startsWith("file:") ||
              p.avatar?.startsWith("content:") ? (
                <Image source={{ uri: p.avatar }} style={styles.avatarImg} />
              ) : p.avatar ? (
                <Text style={{ fontSize: 32 }}>{p.avatar}</Text>
              ) : (
                <Camera color={C.accent} size={27} />
              )}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.avatarTitle}>Tải ảnh đại diện</Text>
              <Text style={styles.hint}>Hoặc chọn avatar có sẵn</Text>
              <View style={styles.avatarActions}>
                <Pressable style={styles.smallButton} onPress={chooseImage}>
                  <Text style={styles.smallButtonText}>Tải từ thư viện</Text>
                </Pressable>
                <Pressable
                  style={styles.smallButton}
                  onPress={() => setAvatarMenu((v) => !v)}
                >
                  <Text style={styles.smallButtonText}>Chọn avatar</Text>
                </Pressable>
              </View>
            </View>
          </View>
          {avatarMenu ? (
            <View style={styles.avatarOptions}>
              {["👩‍🍳", "👨‍🍳", "🥑", "🍅"].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    set("avatar", value);
                    setAvatarMenu(false);
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{value}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>
        {/* CHẾ ĐỘ ĂN */}
        <Card
          title="Chế độ ăn uống chính"
          icon={<UtensilsCrossed color={C.accent} size={17} />}
        >
          <Chips
            values={DIETS}
            selected={[p.diet]}
            onSelect={(value) => set("diet", value)}
          />
        </Card>
        {/* KHẨU VỊ */}
        <Card
          title="Khẩu vị ưa chuộng"
          icon={<Flame color={C.accent} size={17} />}
          note="Chọn nhiều"
        >
          <Text style={styles.hintBlock}>
            AI sẽ điều chỉnh gia vị đề xuất theo gu của bạn.
          </Text>
          <Chips
            values={TASTES}
            selected={p.tastes}
            onSelect={(value) => toggle("tastes", value)}
            multi
          />
        </Card>
        {/* VÙNG MIỀN */}
        <Card
          title="Ẩm thực vùng miền yêu thích"
          icon={<MapPin color={C.accent} size={17} />}
        >
          <Chips
            values={REGIONS}
            selected={[p.region]}
            onSelect={(value) => set("region", value)}
          />
        </Card>
        {/* NGÂN SÁCH VÀ SỐ NGƯỜI */}
        <View style={styles.halves}>
          <View style={[styles.card, styles.half]}>
            <View style={styles.titleRow}>
              <Wallet color={C.accent} size={16} />
              <Text style={styles.cardTitle}>Ngân sách/ngày</Text>
            </View>
            <Pressable
              style={styles.valueBox}
              onPress={() => {
                const index = BUDGETS.indexOf(p.budget);
                const next = BUDGETS[(index + 1) % BUDGETS.length];
                set("budget", next);
              }}
            >
              <Text style={styles.valueText}>
                {p.budget.toLocaleString("vi-VN")} đ ⌄
              </Text>
            </Pressable>
          </View>
          <View style={[styles.card, styles.half]}>
            <View style={styles.titleRow}>
              <Users color={C.accent} size={16} />
              <Text style={styles.cardTitle}>Số người ăn</Text>
            </View>
            <View style={styles.counter}>
              <Pressable
                style={styles.counterBtn}
                onPress={() => set("people", Math.max(1, p.people - 1))}
              >
                <Minus size={16} />
              </Pressable>
              <Text style={styles.valueText}>{p.people} người</Text>
              <Pressable
                style={[
                  styles.counterBtn,
                  {
                    backgroundColor: C.accent,
                  },
                ]}
                onPress={() => set("people", Math.min(20, p.people + 1))}
              >
                <Plus size={16} color={C.white} />
              </Pressable>
            </View>
          </View>
        </View>
        {/* THỜI GIAN NẤU */}
        <Card
          title="Thời gian nấu tối đa"
          icon={<Clock3 color={C.accent} size={17} />}
          note={`${p.cookTime} phút`}
        >
          <View style={styles.times}>
            {[15, 30, 45, 60].map((value) => (
              <Pressable
                key={value}
                style={[
                  styles.timeItem,
                  p.cookTime === value && styles.timeActive,
                ]}
                onPress={() => set("cookTime", value)}
              >
                <Text
                  style={[
                    styles.timeText,
                    p.cookTime === value && {
                      color: C.white,
                      fontWeight: "800",
                    },
                  ]}
                >
                  {value === 60 ? ">60" : value}p
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.timeLabels}>
            <Text style={styles.hint}>Nhanh</Text>
            <Text style={styles.hint}>Vừa</Text>
            <Text style={styles.hint}>Cầu kỳ</Text>
          </View>
        </Card>
        {/* DỊ ỨNG */}
        <Card
          title="Dị ứng thực phẩm"
          icon={<ShieldAlert color={C.accent} size={17} />}
          note="Rất quan trọng"
        >
          <Chips
            values={moreAllergy ? ALLERGIES : ALLERGIES.slice(0, 3)}
            selected={p.allergies}
            onSelect={(value) => toggle("allergies", value)}
            multi
          />
          <Pressable onPress={() => setMoreAllergy((v) => !v)}>
            <Text style={styles.more}>
              {moreAllergy ? "Thu gọn" : "+ Thêm khác"}
            </Text>
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.titleRow}>
            <Ban color={C.accent} size={17} />
            <Text style={styles.cardTitle}>Nguyên liệu không thích ăn</Text>
          </View>
          <View style={{ height: 13 }} />
          <Chips
            values={moreDislike ? DISLIKES : DISLIKES.slice(0, 2)}
            selected={p.dislikes}
            onSelect={(value) => toggle("dislikes", value)}
            multi
          />
          <Pressable onPress={() => setMoreDislike((v) => !v)}>
            <Text style={styles.more}>
              {moreDislike ? "Thu gọn" : "+ Thêm khác"}
            </Text>
          </Pressable>
        </Card>
        <Text style={styles.safety}>
          Thông tin dị ứng chỉ hỗ trợ gợi ý món ăn; luôn kiểm tra thành phần và
          nguy cơ nhiễm chéo trước khi sử dụng.
        </Text>
      </ScrollView>
      {/* NÚT HOÀN TẤT */}
      <View style={styles.footer}>
        <Pressable
          style={styles.finish}
          onPress={() => finish()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Text style={styles.finishText}>
                Hoàn tất & Khám phá Smart Kitchen
              </Text>
              <ArrowRight size={18} color={C.white} />
            </>
          )}
        </Pressable>
        <Text style={styles.footerNote}>
          Bạn có thể cập nhật sở thích trong mục Cá nhân
        </Text>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    height: 69,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  step: {
    backgroundColor: C.peach,
    color: C.accent,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    overflow: "hidden",
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
    marginTop: 4,
  },
  skip: {
    fontSize: 12,
    color: C.gray,
  },
  progress: {
    height: 5,
    marginHorizontal: 24,
    backgroundColor: "#E6DDD8",
    borderRadius: 4,
  },
  progressFill: {
    height: 5,
    width: "86%",
    backgroundColor: C.accent,
    borderRadius: 4,
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 25,
  },
  intro: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFF7F2",
    borderColor: "#F3DCCF",
    borderWidth: 1,
    borderRadius: 16,
  },
  introIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#FCE8DB",
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
    lineHeight: 20,
  },
  introSub: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 18,
    marginTop: 6,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexShrink: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
    flexShrink: 1,
  },
  note: {
    fontSize: 10,
    color: C.gray,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#FFF2E9",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#F9AD76",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  avatarTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.dark,
  },
  hint: {
    fontSize: 10,
    color: C.gray,
    marginTop: 4,
  },
  hintBlock: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 13,
  },
  avatarActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
    flexWrap: "wrap",
  },
  smallButton: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallButtonText: {
    fontSize: 10,
    color: C.orange,
  },
  avatarOptions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 15,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E6DDD8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.white,
  },
  activeChip: {
    borderColor: C.accent,
    backgroundColor: C.peach,
  },
  chipText: {
    fontSize: 11,
    color: "#4C403B",
  },
  activeText: {
    color: C.orange,
    fontWeight: "800",
  },
  halves: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
    padding: 13,
    gap: 14,
    minWidth: 0,
  },
  valueBox: {
    height: 43,
    borderRadius: 10,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  valueText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.dark,
  },
  counter: {
    height: 43,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 4,
  },
  counterBtn: {
    width: 27,
    height: 28,
    backgroundColor: "#F4F0ED",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  times: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: "#F4EEEA",
    padding: 4,
    borderRadius: 12,
  },
  timeItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 9,
  },
  timeActive: {
    backgroundColor: C.accent,
  },
  timeText: {
    fontSize: 12,
    color: C.muted,
  },
  timeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  more: {
    color: C.accent,
    fontSize: 11,
    marginTop: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 16,
  },
  safety: {
    fontSize: 10,
    color: C.muted,
    lineHeight: 16,
  },
  footer: {
    backgroundColor: C.cream,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  finish: {
    height: 57,
    borderRadius: 14,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  finishText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.white,
  },
  footerNote: {
    fontSize: 10,
    color: C.gray,
    textAlign: "center",
    marginTop: 10,
  },
  pageHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.cream,
  },
  pageTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
    marginHorizontal: 8,
  },
});
