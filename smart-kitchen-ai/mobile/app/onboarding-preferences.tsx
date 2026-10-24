import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { saveUserPreferences } from "../lib/api";
import { getAuthUser } from "../lib/auth";
import { getUserPreferences } from "../lib/preferencesApi";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
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
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isEditing = from === "profile";
  const [p, setP] = useState<Pref>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moreAllergy, setMoreAllergy] = useState(false);
  const [moreDislike, setMoreDislike] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const GUEST_KEY = `${PREF_KEY}-guest`;
  const [customAllergy, setCustomAllergy] = useState("");
  const [customDislike, setCustomDislike] = useState("");
  const [customBudget, setCustomBudget] = useState("");

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("vi-VN").format(value);

  const handleCustomBudget = (text: string) => {
    const digits = text.replace(/\D/g, "");
    const amount = Number(digits);

    setCustomBudget(digits);

    setP((prev) => ({
      ...prev,
      budget: amount,
    }));
  };

  useEffect(() => {
    let active = true;
    async function loadPreferences() {
      setLoading(true);
      setLoadError(null);
      try {
        const user = await getAuthUser();
        if (!active) return;
        const userId = Number(user?.user_id);
        const hasAccount = Number.isSafeInteger(userId) && userId > 0;

        if (hasAccount) {
          // Đã đăng nhập: luôn đọc lựa chọn hiện tại từ MySQL.
          // Không tự thay bằng mặc định nếu server gặp lỗi.
          const remote = await getUserPreferences(userId);
          if (!active) return;
          const current: Pref = {
            ...DEFAULT,
            diet: remote.diet ?? DEFAULT.diet,
            tastes: Array.isArray(remote.tastes) ? remote.tastes : [],
            region: remote.region ?? DEFAULT.region,
            budget: Number(remote.budget ?? DEFAULT.budget),
            people: Number(remote.people ?? DEFAULT.people),
            cookTime: Number(remote.cookTime ?? DEFAULT.cookTime),
            allergies: Array.isArray(remote.allergies) ? remote.allergies : [],
            dislikes: Array.isArray(remote.dislikes) ? remote.dislikes : [],
            completed: true,
          };
          setP(current);
          await AsyncStorage.setItem(
            `${PREF_KEY}-${userId}`,
            JSON.stringify(current),
          );
        } else {
          // Chưa đăng nhập: chỉ lấy dữ liệu từng chọn trên thiết bị.
          const raw = await AsyncStorage.getItem(GUEST_KEY);
          if (active)
            setP(raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT });
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Không thể tải sở thích ăn uống.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPreferences();
    return () => {
      active = false;
    };
  }, []);
  const set = <K extends keyof Pref>(key: K, value: Pref[K]) => {
    setP((old) => ({
      ...old,
      [key]: value,
    }));
  };
  const addCustomItem = (
    type: "allergies" | "dislikes",
    input: string,
    clearInput: () => void,
  ) => {
    const value = input.trim().replace(/\s+/g, " ");

    if (!value) return;

    setP((prev) => {
      const exists = prev[type].some(
        (item) => item.toLowerCase() === value.toLowerCase(),
      );

      if (exists) return prev;

      return {
        ...prev,
        [type]: [...prev[type], value],
      };
    });

    clearInput();
  };
  const toggle = (key: "tastes" | "allergies" | "dislikes", value: string) => {
    setP((old) => ({
      ...old,
      [key]: old[key].includes(value)
        ? old[key].filter((item) => item !== value)
        : [...old[key], value],
    }));
  };
  const finish = async (skip = false) => {
    if (saving || loadError) return;
    if (skip && isEditing) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      const user = await getAuthUser();
      const userId = Number(user?.user_id);
      const hasAccount = Number.isSafeInteger(userId) && userId > 0;
      const updatedPreferences: Pref = { ...p, completed: !skip };

      if (hasAccount) {
        // Đã đăng nhập: lưu MySQL trước, cache chỉ cập nhật sau khi API thành công.
        if (!skip) await saveUserPreferences(userId, updatedPreferences);
        await AsyncStorage.setItem(
          `${PREF_KEY}-${userId}`,
          JSON.stringify(updatedPreferences),
        );
      } else {
        // Chưa đăng nhập: tuyệt đối không gọi API yêu cầu user_id.
        // Lưu riêng trên máy để giữ các lựa chọn trong luồng bắt đầu.
        await AsyncStorage.setItem(
          GUEST_KEY,
          JSON.stringify(updatedPreferences),
        );
      }
      router.replace(isEditing ? "/profile" : "/home");
    } catch (error) {
      Alert.alert(
        "Không thể lưu thiết lập",
        error instanceof Error ? error.message : "Có lỗi xảy ra",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loadError) {
    return (
      <SafeAreaView style={styles.center}>
        <Text
          style={{ color: C.dark, textAlign: "center", paddingHorizontal: 25 }}
        >
          Không tải được sở thích ăn uống: {loadError}
        </Text>
        <Pressable style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: C.orange, fontWeight: "700" }}>Quay lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={C.accent} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      {/* HEADER CHUNG */}
      <AppHeader />
      {/* TIÊU ĐỀ TRANG 37 */}
      <View style={styles.pageHeading}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ArrowLeft size={20} color={C.dark} />
        </Pressable>
        <Text style={styles.pageTitle}>
          {isEditing
            ? "Chỉnh sửa sở thích ăn uống"
            : "Thiết lập khẩu vị cá nhân"}
        </Text>
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
                {p.budget.toLocaleString("vi-VN")} đ
              </Text>
            </Pressable>
            <TextInput
            style={styles.valueBox}
            placeholder="Nhập ngân sách..."
            placeholderTextColor="#948780"
            keyboardType="numeric"
            value={p.budget > 0 ? String(p.budget) : ""}
            onChangeText={(text) => {
              const amount = Number(text.replace(/\D/g, ""));
              set("budget", amount);
            }}
          />
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
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Nhập thực phẩm dị ứng khác..."
              placeholderTextColor="#9B8A82"
              value={customAllergy}
              onChangeText={setCustomAllergy}
              returnKeyType="done"
              onSubmitEditing={() =>
                addCustomItem("allergies", customAllergy, () =>
                  setCustomAllergy(""),
                )
              }
            />

            <Pressable
              style={styles.addCustomButton}
              onPress={() =>
                addCustomItem("allergies", customAllergy, () =>
                  setCustomAllergy(""),
                )
              }
            >
              <Text style={styles.addCustomButtonText}>+ Thêm</Text>
            </Pressable>
          </View>

          <View style={styles.customTags}>
            {p.allergies
              .filter(
                (item) =>
                  !ALLERGIES.some(
                    (option) => option.toLowerCase() === item.toLowerCase(),
                  ),
              )
              .map((item) => (
                <Pressable
                  key={item}
                  style={styles.customTag}
                  onPress={() =>
                    setP((prev) => ({
                      ...prev,
                      allergies: prev.allergies.filter(
                        (value) => value !== item,
                      ),
                    }))
                  }
                >
                  <Text style={styles.customTagText}>{item} ×</Text>
                </Pressable>
              ))}
          </View>
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
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Nhập nguyên liệu không thích..."
              placeholderTextColor="#9B8A82"
              value={customDislike}
              onChangeText={setCustomDislike}
              returnKeyType="done"
              onSubmitEditing={() =>
                addCustomItem("dislikes", customDislike, () =>
                  setCustomDislike(""),
                )
              }
            />

            <Pressable
              style={styles.addCustomButton}
              onPress={() =>
                addCustomItem("dislikes", customDislike, () =>
                  setCustomDislike(""),
                )
              }
            >
              <Text style={styles.addCustomButtonText}>+ Thêm</Text>
            </Pressable>
          </View>

          <View style={styles.customTags}>
            {p.dislikes
              .filter(
                (item) =>
                  !DISLIKES.some(
                    (option) => option.toLowerCase() === item.toLowerCase(),
                  ),
              )
              .map((item) => (
                <Pressable
                  key={item}
                  style={styles.customTag}
                  onPress={() =>
                    setP((prev) => ({
                      ...prev,
                      dislikes: prev.dislikes.filter((value) => value !== item),
                    }))
                  }
                >
                  <Text style={styles.customTagText}>{item} ×</Text>
                </Pressable>
              ))}
          </View>

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
                {isEditing
                  ? "Lưu thay đổi"
                  : "Hoàn tất & Khám phá Smart Kitchen"}
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
  hintBlock: {
    fontSize: 12,
    color: "#735A51",
    lineHeight: 19,
    marginBottom: 12,
  },
  hint: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "500",
  },
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
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },

  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E7D6CD",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#201A17",
    backgroundColor: "#FFFFFF",
  },

  addCustomButton: {
    backgroundColor: "#F05A0A",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
  },

  addCustomButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  customTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  customTag: {
    backgroundColor: "#FFF0E6",
    borderWidth: 1,
    borderColor: "#F05A0A",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
  },

  customTagText: {
    color: "#A23A00",
    fontWeight: "600",
  },
});
