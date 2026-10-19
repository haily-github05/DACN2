import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Check, Sparkles } from "lucide-react-native";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

const blocks: [string, string, string][] = [
  ["input", "Tìm kiếm món ăn", "Nhập tên món hoặc nguyên liệu"],
  ["choice", "Danh mục món ăn", "Món Việt|Món chay|Ăn sáng"],
  ["link", "Bộ lọc · Thời gian · Độ khó · Vùng miền", "/recipe-filters"],
  ["section", "Gợi ý hôm nay", ""],
  ["item", "Canh bí đỏ", "25 phút"],
  ["item", "Cá hồi áp chảo", "20 phút"],
  ["link", "Xem kết quả tìm kiếm", "/recipes"],
  ["link", "Cộng đồng ẩm thực", "/community"],
  ["link", "Trợ lý nấu ăn AI", "/ai-assistant"],
];
const ORANGE = "#A23A00";
export default function Screen() {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [seconds, setSeconds] = useState(300);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [read, setRead] = useState(false);
  const go = (path: string) => router.push(path as any);
  const action = (label: string, target: string) => {
    if (target.startsWith("/")) return go(target);
    if (target === "generate")
      return Alert.alert(
        "Thực đơn mẫu",
        "Đã tạo thực đơn demo. Khi có backend, hệ thống sẽ tạo thực đơn dựa trên kho thực tế.",
      );
    if (target === "summary")
      return Alert.alert(
        "Danh sách mua sắm",
        `Đã chọn ${Object.values(checked).filter(Boolean).length} nguyên liệu.`,
      );
    if (target === "photo")
      return Alert.alert(
        "Chọn ảnh",
        "Tính năng chọn ảnh cho bài đăng sẽ được kết nối sau.",
      );
    if (target === "like" || target === "bookmark")
      return Alert.alert("Đã chọn", label);
    Alert.alert(
      "Chế độ demo",
      "Thông tin chưa được lưu lên máy chủ. Cần kết nối backend hoặc kho dữ liệu dùng chung.",
    );
  };
  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <AppHeader showNotification unreadCount={3} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heading}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={23} color={ORANGE} />
          </Pressable>
          <Text style={styles.title}>Khám phá món ăn</Text>
        </View>
        <Text style={styles.subtitle}>"Tìm công thức theo sở thích"</Text>
        {blocks.map(([kind, label, detail], i) => {
          if (kind === "section")
            return (
              <Text key={i} style={styles.section}>
                {label}
              </Text>
            );
          if (
            kind === "hero" ||
            kind === "highlight" ||
            kind === "chatbot" ||
            kind === "chatuser" ||
            kind === "note"
          )
            return (
              <View
                key={i}
                style={[
                  styles.card,
                  (kind === "highlight" || kind === "chatbot") &&
                    styles.highlight,
                ]}
              >
                <Text style={styles.cardTitle}>{label}</Text>
                {!!detail && <Text style={styles.detail}>{detail}</Text>}
              </View>
            );
          if (kind === "item" || kind === "step")
            return (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>{label}</Text>
                {!!detail && <Text style={styles.detail}>{detail}</Text>}
              </View>
            );
          if (kind === "input" || kind === "chatinput")
            return (
              <View key={i}>
                <Text style={styles.fieldLabel}>
                  {kind === "input" ? label : ""}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={kind === "chatinput" ? label : detail}
                  placeholderTextColor="#9A8176"
                  value={inputs[label] ?? ""}
                  onChangeText={(v) => setInputs((p) => ({ ...p, [label]: v }))}
                />
              </View>
            );
          if (kind === "choice")
            return (
              <View key={i} style={styles.choiceWrap}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <View style={styles.options}>
                  {detail.split("|").map((v, j) => (
                    <Pressable
                      key={j}
                      onPress={() => setChoices((p) => ({ ...p, [label]: v }))}
                      style={[
                        styles.option,
                        (choices[label] ?? detail.split("|")[0]) === v &&
                          styles.optionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          (choices[label] ?? detail.split("|")[0]) === v &&
                            styles.optionTextActive,
                        ]}
                      >
                        {v}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          if (kind === "check")
            return (
              <Pressable
                key={i}
                style={styles.card}
                onPress={() =>
                  setChecked((p) => ({ ...p, [label]: !p[label] }))
                }
              >
                <Text style={styles.cardTitle}>
                  {checked[label] ? "☑" : "☐"} {label}
                </Text>
                <Text style={styles.detail}>{detail}</Text>
              </Pressable>
            );
          if (kind === "timer")
            return (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>{label}</Text>
                <Text style={styles.time}>
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                  {String(seconds % 60).padStart(2, "0")}
                </Text>
                <Text style={styles.detail}>
                  Bộ đếm demo: dùng nút +/− để điều chỉnh; chưa chạy nền.
                </Text>
                <View style={styles.options}>
                  <Pressable
                    style={styles.option}
                    onPress={() => setSeconds((v) => Math.max(0, v - 30))}
                  >
                    <Text>− 30 giây</Text>
                  </Pressable>
                  <Pressable
                    style={styles.option}
                    onPress={() => setSeconds((v) => v + 30)}
                  >
                    <Text>+ 30 giây</Text>
                  </Pressable>
                </View>
              </View>
            );
          if (kind === "link" || kind === "action")
            return (
              <Pressable
                key={i}
                style={[
                  styles.button,
                  kind === "link" && styles.secondaryButton,
                ]}
                onPress={() => action(label, detail)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    kind === "link" && styles.secondaryText,
                  ]}
                >
                  {label}
                </Text>
                {kind === "link" && <ChevronRight size={17} color={ORANGE} />}
              </Pressable>
            );
          return null;
        })}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF8F6" },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 14 },
  back: { width: 24, height: 38, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#201A17", flexShrink: 1 },
  subtitle: { fontSize: 12, color: "#735A51", marginBottom: 13 },
  section: { fontSize: 16, fontWeight: "800", color: "#201A17", marginTop: 14 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#EED9CF",
    padding: 17,
    gap: 8,
  },
  highlight: { backgroundColor: "#FEF1EB" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#201A17" },
  detail: { fontSize: 12, color: "#735A51", lineHeight: 20 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#201A17",
    marginBottom: 9,
    marginTop: 9,
  },
  input: {
    height: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EED9CF",
    borderRadius: 11,
    paddingHorizontal: 13,
    color: "#201A17",
  },
  choiceWrap: { marginBottom: 2 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: "#EED9CF",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },
  optionActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  optionText: { fontSize: 12, color: "#735A51" },
  optionTextActive: { color: "#FFFFFF", fontWeight: "800" },
  button: {
    minHeight: 50,
    backgroundColor: ORANGE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  buttonText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EED9CF",
  },
  secondaryText: { color: ORANGE },
  time: { fontSize: 30, fontWeight: "800", color: ORANGE, textAlign: "center" },
});
