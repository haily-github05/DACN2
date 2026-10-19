import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Save,
  ChevronDown,
  Check,
  Package,
} from "lucide-react-native";
import BottomNav from "../components/BottomNav";
import {
  Ingredient,
  findIngredient,
  updateIngredient,
  dateIsValid,
} from "../lib/ingredients";
const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  border: "#EED9CF",
  dark: "#201A17",
  muted: "#735A51",
  white: "#FFFFFF",
};
const CATEGORIES = [
  "Rau củ",
  "Trái cây",
  "Thịt",
  "Hải sản",
  "Trứng",
  "Sữa",
  "Đồ khô",
  "Gia vị",
  "Khác",
];
const UNITS = [
  "Quả",
  "Kg",
  "Gram",
  "Lít",
  "Ml",
  "Gói",
  "Hộp",
  "Chai",
  "Cái",
  "Bó",
];
const LOCATIONS = ["Ngăn mát tủ lạnh", "Ngăn đông", "Tủ bếp", "Nhiệt độ phòng"];
function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 85, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={C.muted}
      />
    </View>
  );
}
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Pressable style={s.inputRow} onPress={() => setOpen(!open)}>
        <Text style={s.value}>{value}</Text>
        <ChevronDown size={17} color={C.muted} />
      </Pressable>
      {open && (
        <View style={s.options}>
          {options.map((o) => (
            <Pressable
              key={o}
              style={s.option}
              onPress={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              <Text style={{ color: o === value ? C.orange : C.dark }}>
                {o}
              </Text>
              {o === value && <Check size={16} color={C.orange} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
export default function EditIngredient() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [original, setOriginal] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Rau củ");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Gram");
  const [location, setLocation] = useState("Ngăn mát tủ lạnh");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [note, setNote] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const found = id ? await findIngredient(id) : null;
          if (!active) return;
          setOriginal(found);
          if (found) {
            setName(found.name);
            setCategory(found.category);
            setQuantity(String(found.quantity));
            setUnit(found.unit);
            setLocation(found.location);
            setPurchaseDate(found.purchaseDate || "");
            setExpiryDate(found.expiryDate || "");
            setNote(found.note || "");
          }
        } catch (e) {
          Alert.alert("Lỗi", "Không thể đọc dữ liệu kho thực phẩm.");
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [id]),
  );
  async function save() {
    if (!original || saving) return;
    const q = Number(quantity.replace(",", "."));
    if (!name.trim())
      return Alert.alert("Thiếu tên", "Vui lòng nhập tên nguyên liệu.");
    if (!Number.isFinite(q) || q <= 0)
      return Alert.alert("Số lượng không hợp lệ", "Số lượng phải lớn hơn 0.");
    if (purchaseDate && !dateIsValid(purchaseDate))
      return Alert.alert("Ngày mua không hợp lệ", "Nhập theo YYYY-MM-DD.");
    if (expiryDate && !dateIsValid(expiryDate))
      return Alert.alert("Hạn sử dụng không hợp lệ", "Nhập theo YYYY-MM-DD.");
    if (purchaseDate && expiryDate && expiryDate < purchaseDate)
      return Alert.alert("Ngày không hợp lệ", "Hạn dùng phải sau ngày mua.");
    setSaving(true);
    try {
      await updateIngredient({
        ...original,
        name: name.trim(),
        category,
        quantity: q,
        unit,
        location,
        purchaseDate,
        expiryDate,
        note: note.trim(),
      });
      Alert.alert("Thành công", "Đã lưu thay đổi.", [
        {
          text: "Đồng ý",
          onPress: () =>
            router.replace({
              pathname: "/ingredient-detail",
              params: { id: original.id },
            }),
        },
      ]);
    } catch (e) {
      Alert.alert(
        "Không thể lưu",
        e instanceof Error ? e.message : "Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={C.orange} />
        <Text>Đang tải nguyên liệu...</Text>
      </SafeAreaView>
    );
  if (!original)
    return (
      <SafeAreaView style={s.center}>
        <Package size={42} color={C.muted} />
        <Text style={s.title}>Không tìm thấy nguyên liệu</Text>
        <Text style={s.help}>
          Hãy mở nguyên liệu từ Kho thực phẩm. ID nhận được: {id ?? "(trống)"}
        </Text>
        <Pressable style={s.save} onPress={() => router.replace("/pantry")}>
          <Text style={s.saveText}>Về kho thực phẩm</Text>
        </Pressable>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.screen} edges={["left", "right"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <ArrowLeft color={C.orange} size={22} />
        </Pressable>
        <View>
          <Text style={s.title}>Chỉnh sửa nguyên liệu</Text>
          <Text style={s.help}>Cập nhật thông tin thực phẩm</Text>
        </View>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <View style={s.card}>
            <Text style={s.section}>Thông tin cơ bản</Text>
            <Field
              label="Tên nguyên liệu *"
              value={name}
              onChangeText={setName}
            />
            <SelectField
              label="Danh mục"
              value={category}
              options={CATEGORIES}
              onChange={setCategory}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Số lượng *"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <SelectField
                  label="Đơn vị"
                  value={unit}
                  options={UNITS}
                  onChange={setUnit}
                />
              </View>
            </View>
          </View>
          <View style={s.card}>
            <Text style={s.section}>Bảo quản</Text>
            <SelectField
              label="Vị trí bảo quản"
              value={location}
              options={LOCATIONS}
              onChange={setLocation}
            />
          </View>
          <View style={s.card}>
            <Text style={s.section}>Thời gian sử dụng</Text>
            <Field
              label="Ngày mua (YYYY-MM-DD)"
              value={purchaseDate}
              onChangeText={setPurchaseDate}
            />
            <Field
              label="Hạn sử dụng (YYYY-MM-DD)"
              value={expiryDate}
              onChangeText={setExpiryDate}
            />
          </View>
          <View style={s.card}>
            <Text style={s.section}>Ghi chú</Text>
            <Field
              label="Ghi chú thêm"
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>
          <Pressable
            disabled={saving}
            style={[s.save, saving && { opacity: 0.6 }]}
            onPress={save}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Save color="white" size={19} />
                <Text style={s.saveText}>Lưu thay đổi</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={{ alignItems: "center", padding: 12 }}
          >
            <Text style={s.help}>Hủy chỉnh sửa</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNav />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  center: {
    flex: 1,
    backgroundColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    gap: 12,
  },
  header: {
    backgroundColor: C.white,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "800", color: C.dark },
  help: { fontSize: 12, color: C.muted, marginTop: 4, textAlign: "center" },
  content: { padding: 16, gap: 15, paddingBottom: 30 },
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },
  section: { fontSize: 15, fontWeight: "800", color: C.dark },
  field: { gap: 7 },
  label: { fontSize: 12, fontWeight: "700", color: C.muted },
  input: {
    minHeight: 46,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    color: C.dark,
    fontSize: 13,
  },
  inputRow: {
    minHeight: 46,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: { fontSize: 13, color: C.dark, flex: 1 },
  options: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 11,
    overflow: "hidden",
  },
  option: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  save: {
    backgroundColor: C.orange,
    borderRadius: 13,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  saveText: { color: "white", fontWeight: "800", fontSize: 14 },
});
