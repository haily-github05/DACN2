import React, { useState } from "react";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
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

import {
  ArrowLeft,
  Sparkles,
  Pencil,
  Plus,
  Check,
  Trash2,
  House,
  Package,
  Compass,
  CalendarDays,
  UserRound,
} from "lucide-react-native";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  green: "#39845A",
};

type Ingredient = {
  id: string;
  emoji: string;
  name: string;
  quantity: string;
  unit: string;
  confidence: number | null;
};

const initialIngredients: Ingredient[] = [
  {
    id: "1",
    emoji: "🍅",
    name: "Cà chua",
    quantity: "500",
    unit: "g",
    confidence: 96,
  },
  {
    id: "2",
    emoji: "🥚",
    name: "Trứng gà",
    quantity: "6",
    unit: "quả",
    confidence: 94,
  },
  {
    id: "3",
    emoji: "🥬",
    name: "Cải xanh",
    quantity: "300",
    unit: "g",
    confidence: 91,
  },
];

export default function ScanResultScreen() {
  const router = useRouter();

  const [ingredients, setIngredients] =
    useState<Ingredient[]>(initialIngredients);

  const [editing, setEditing] = useState(false);

  const updateIngredient = (
    id: string,
    field: "name" | "quantity" | "unit",
    value: string,
  ) => {
    setIngredients((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addIngredient = () => {
    setIngredients((current) => [
      ...current,
      {
        id: Date.now().toString(),
        emoji: "🥗",
        name: "",
        quantity: "1",
        unit: "g",
        confidence: null,
      },
    ]);
    setEditing(true);
  };

  const removeIngredient = (id: string) => {
    setIngredients((current) => current.filter((item) => item.id !== id));
  };

  const confirmSave = () => {
    if (ingredients.length === 0) {
      Alert.alert(
        "Chưa có nguyên liệu",
        "Vui lòng thêm ít nhất một nguyên liệu.",
      );
      return;
    }

    const invalid = ingredients.some(
      (item) =>
        !item.name.trim() ||
        !item.unit.trim() ||
        !item.quantity.trim() ||
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0,
    );

    if (invalid) {
      Alert.alert(
        "Thông tin chưa hợp lệ",
        "Vui lòng nhập tên, số lượng lớn hơn 0 và đơn vị cho tất cả nguyên liệu.",
      );
      return;
    }

    Alert.alert(
      "Xác nhận nguyên liệu",
      "Dữ liệu đã hợp lệ. Chức năng lưu vào kho sẽ được kết nối ở bước tiếp theo.",
      [
        { text: "Đóng" },
        {
          text: "Về trang chủ",
          onPress: () => router.replace("/home"),
        },
      ],
    );
  };

  const notReady = (name: string) => {
    Alert.alert(name, "Màn hình này sẽ được xây dựng tiếp theo.");
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <AppHeader showNotification unreadCount={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* TIÊU ĐỀ */}
        <View style={styles.heading}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={C.orange} />
          </Pressable>

          <Text style={styles.title}>Kết quả nhận diện</Text>
        </View>

        <Text style={styles.subtitle}>
          Kiểm tra và chỉnh sửa trước khi thêm vào kho
        </Text>

        {/* THÔNG BÁO AI */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeading}>
            <Sparkles size={19} color={C.orange} />

            <Text style={styles.aiTitle}>
              AI đã tìm thấy {ingredients.length} nguyên liệu
            </Text>
          </View>

          <Text style={styles.aiDescription}>
            Bạn có thể sửa tên, đơn vị hoặc số lượng để đảm bảo dữ liệu trong
            kho chính xác.
          </Text>
        </View>

        {/* DANH SÁCH NGUYÊN LIỆU */}
        <View style={styles.ingredientList}>
          {ingredients.map((item) => (
            <View key={item.id} style={styles.ingredientCard}>
              <View style={styles.emojiBox}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>

              <View style={styles.ingredientInfo}>
                {editing ? (
                  <>
                    <TextInput
                      style={styles.nameInput}
                      value={item.name}
                      placeholder="Tên nguyên liệu"
                      placeholderTextColor="#A18B81"
                      onChangeText={(value) =>
                        updateIngredient(item.id, "name", value)
                      }
                    />

                    <View style={styles.editRow}>
                      <TextInput
                        style={styles.quantityInput}
                        value={item.quantity}
                        keyboardType="decimal-pad"
                        onChangeText={(value) =>
                          updateIngredient(item.id, "quantity", value)
                        }
                      />

                      <TextInput
                        style={styles.unitInput}
                        value={item.unit}
                        placeholder="Đơn vị"
                        onChangeText={(value) =>
                          updateIngredient(item.id, "unit", value)
                        }
                      />
                    </View>

                    {item.confidence !== null && (
                      <Text style={styles.confidence}>
                        Tin cậy {item.confidence}%
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.ingredientName}>{item.name}</Text>

                    <Text style={styles.ingredientDetails}>
                      {item.quantity} {item.unit}
                      {item.confidence !== null
                        ? `   ·   Tin cậy ${item.confidence}%`
                        : "   ·   Thêm thủ công"}
                    </Text>
                  </>
                )}
              </View>

              {editing && (
                <Pressable
                  onPress={() => removeIngredient(item.id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={18} color="#C34B38" />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {/* CHỈNH SỬA / THÊM */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.editButton}
            onPress={() => setEditing((value) => !value)}
          >
            {editing ? (
              <Check size={17} color={C.orange} />
            ) : (
              <Pencil size={17} color={C.orange} />
            )}

            <Text style={styles.actionText}>
              {editing ? "Hoàn tất sửa" : "Sửa số lượng"}
            </Text>
          </Pressable>

          <Pressable style={styles.addButton} onPress={addIngredient}>
            <Plus size={18} color={C.orange} />
            <Text style={styles.actionText}>Thêm dòng</Text>
          </Pressable>
        </View>

        {/* XÁC NHẬN */}
        <Pressable style={styles.confirmButton} onPress={confirmSave}>
          <Check size={21} color={C.white} />
          <Text style={styles.confirmText}>Xác nhận và lưu vào kho</Text>
        </Pressable>
      </ScrollView>

      {/* BOTTOM NAV */}
      <BottomNav />
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 25,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  backButton: {
    width: 25,
    height: 36,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: C.dark,
  },
  subtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 13,
  },
  aiCard: {
    marginTop: 32,
    padding: 18,
    backgroundColor: C.peach,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  aiHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.orange,
  },
  aiDescription: {
    marginTop: 14,
    fontSize: 12,
    color: C.muted,
    lineHeight: 20,
  },
  ingredientList: {
    marginTop: 24,
    gap: 12,
  },
  ingredientCard: {
    minHeight: 86,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  emojiBox: {
    width: 54,
    height: 54,
    backgroundColor: C.peach,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 28,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
  },
  ingredientDetails: {
    marginTop: 8,
    fontSize: 12,
    color: C.muted,
  },
  nameInput: {
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingVertical: 4,
    fontSize: 14,
    color: C.dark,
    fontWeight: "700",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 7,
  },
  quantityInput: {
    width: 72,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: C.dark,
    fontSize: 12,
  },
  unitInput: {
    width: 68,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: C.dark,
    fontSize: 12,
  },
  confidence: {
    color: C.green,
    fontSize: 11,
    marginTop: 6,
  },
  deleteButton: {
    padding: 5,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  editButton: {
    flex: 1,
    height: 46,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButton: {
    flex: 1,
    height: 46,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    color: C.orange,
    fontWeight: "800",
  },
  confirmButton: {
    marginTop: 23,
    height: 54,
    borderRadius: 13,
    backgroundColor: C.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  confirmText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
