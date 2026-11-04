// Trang: Tạo bài viết — ảnh bìa, công thức, nguyên liệu, các bước nấu và lưu nháp.
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  Camera,
  Check,
  ChefHat,
  Clock3,
  Globe,
  Lock,
  ImagePlus,
  Leaf,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react-native";
import { kitchenRequest } from "../lib/kitchenApi";
import { getCurrentUserId } from "../lib/auth";
import { uploadPostImage } from "../lib/communityApi";
import FoodImage from "../components/FoodImage";
import AppHeader from "../components/AppHeader";
import { accent, s } from "../components/post/styles";

type Ingredient = { name: string; quantity: string; unit: string };
type Step = { title: string; instruction: string };
type Draft = {
  visibility: "PUBLIC" | "PRIVATE";
  mode: "recipe" | "tip";
  title: string;
  description: string;
  image: string;
  category: string;
  tags: string;
  minutes: string;
  servings: string;
  difficulty: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  ingredients: Ingredient[];
  steps: Step[];
  tip: string;
};
const emptyDraft = (): Draft => ({
  visibility: "PUBLIC",
  mode: "recipe",
  title: "",
  description: "",
  image: "",
  category: "🍲 Món Việt",
  tags: "",
  minutes: "20",
  servings: "2",
  difficulty: "Dễ làm",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  ingredients: [{ name: "", quantity: "", unit: "g" }],
  steps: [{ title: "", instruction: "" }],
  tip: "",
});
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}
function compose(d: Draft) {
  if (d.mode === "tip")
    return [d.description.trim(), d.tags.trim()].filter(Boolean).join("\n\n");
  const nutrition = [
    ["Năng lượng", d.calories, "kcal"],
    ["Đạm", d.protein, "g"],
    ["Tinh bột", d.carbs, "g"],
    ["Chất béo", d.fat, "g"],
  ]
    .filter(([, v]) => v.trim())
    .map(([label, v, unit]) => `${label}: ${v} ${unit}`)
    .join(" · ");
  return [
    d.description.trim(),
    `THÔNG TIN MÓN\n${d.minutes} phút · ${d.servings} người · ${d.difficulty}`,
    nutrition ? `DINH DƯỠNG ƯỚC TÍNH / KHẨU PHẦN\n${nutrition}` : "",
    `NGUYÊN LIỆU\n${d.ingredients.map((i) => `• ${i.name.trim()} — ${i.quantity} ${i.unit.trim()}`).join("\n")}`,
    `CÁCH LÀM\n${d.steps.map((step, index) => `${index + 1}. ${step.title.trim() || `Bước ${index + 1}`}\n${step.instruction.trim()}`).join("\n\n")}`,
    d.tip.trim() ? `MẸO NHỎ\n${d.tip.trim()}` : "",
    d.tags.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}
export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const draftKey = useRef("");
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    getCurrentUserId()
      .then(async (id) => {
        draftKey.current = `community-post-draft-v1:${id}`;
        const raw = await AsyncStorage.getItem(draftKey.current);
        if (raw && active) {
          const saved = JSON.parse(raw);
          if (
            saved &&
            typeof saved.title === "string" &&
            Array.isArray(saved.ingredients) &&
            Array.isArray(saved.steps)
          )
            setDraft({ ...emptyDraft(), ...saved });
        }
        if (active) setReady(true);
      })
      .catch((error) => {
        if (active) {
          setReady(Boolean(draftKey.current));
          Alert.alert("Không thể mở bản nháp", error.message);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const update = <K extends keyof Draft>(field: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [field]: value }));
  const pick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) update("image", result.assets[0].uri);
    } catch {
      Alert.alert(
        "Không thể chọn ảnh",
        "Vui lòng thử lại với ảnh JPEG hoặc PNG.",
      );
    }
  };
  const issues = () => {
    const missing: string[] = [];
    if (!draft.title.trim()) missing.push("Tên món / tiêu đề");
    if (!draft.description.trim()) missing.push("Mô tả / nội dung");
    if (draft.mode === "recipe") {
      if (
        !Number.isInteger(Number(draft.minutes)) ||
        Number(draft.minutes) < 1 ||
        Number(draft.minutes) > 1440
      )
        missing.push("Thời gian từ 1–1440 phút");
      if (
        !Number.isInteger(Number(draft.servings)) ||
        Number(draft.servings) < 1 ||
        Number(draft.servings) > 100
      )
        missing.push("Khẩu phần từ 1–100 người");
      if (
        !draft.ingredients.length ||
        draft.ingredients.some(
          (i) =>
            !i.name.trim() ||
            !i.unit.trim() ||
            !Number.isFinite(Number(i.quantity)) ||
            Number(i.quantity) <= 0,
        )
      )
        missing.push("Tên, số lượng và đơn vị từng nguyên liệu");
      if (
        !draft.steps.length ||
        draft.steps.some((step) => !step.instruction.trim())
      )
        missing.push("Nội dung từng bước nấu");
      if (
        [draft.calories, draft.protein, draft.carbs, draft.fat].some(
          (v) => v.trim() && (!Number.isFinite(Number(v)) || Number(v) < 0),
        )
      )
        missing.push("Dinh dưỡng phải là số không âm");
    }
    return missing;
  };
  const saveDraft = async () => {
    if (!ready || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await AsyncStorage.setItem(draftKey.current, JSON.stringify(draft));
      Alert.alert(
        "Đã lưu nháp",
        "Mở lại trang đăng bài trên thiết bị này để tiếp tục chỉnh sửa.",
      );
    } catch {
      Alert.alert("Không thể lưu nháp", "Vui lòng thử lại.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = async () => {
    if (!ready || lock.current) return;
    const missing = issues();
    if (missing.length) {
      Alert.alert("Hoàn thiện bài viết", missing.join("\n"));
      return;
    }
    if (!accepted) {
      Alert.alert(
        "Xác nhận chia sẻ",
        "Hãy xác nhận nội dung và quyền sử dụng ảnh trước khi đăng.",
      );
      return;
    }
    const description = compose(draft);
    if (description.length > 10000) {
      Alert.alert(
        "Bài viết quá dài",
        "Rút gọn nội dung còn tối đa 10.000 ký tự.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      let image = draft.image;
      if (
        image &&
        !/^https?:\/\//.test(image) &&
        !image.startsWith("/uploads/")
      ) {
        image = await uploadPostImage(image);
        update("image", image);
      }
      const post = await kitchenRequest<{ id: string }>("posts", "POST", {
        title: draft.title.trim(),
        description,
        image,
        category: draft.category,
        visibility: draft.visibility,
      });
      await AsyncStorage.removeItem(draftKey.current).catch(() => {});
      router.replace({ pathname: "/post-detail", params: { id: post.id } });
    } catch (error) {
      Alert.alert(
        "Không thể đăng bài",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={s.page} edges={["left", "right"]}>
      <AppHeader />
      <View style={s.pageHeading}>
        <Pressable disabled={busy} accessibilityLabel="Quay lại" style={s.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/community")}>
          <ArrowLeft size={22} color={accent} />
        </Pressable>
        <Text style={s.heading}>Tạo bài viết mới</Text>
      </View>
      {!ready ? (
        <ActivityIndicator color={accent} style={{ margin: 30 }} />
      ) : (
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.tabs}>
              {(
                [
                  ["recipe", "🍳 Công thức nấu ăn"],
                  ["tip", "💡 Mẹo vặt & Bí quyết"],
                ] as const
              ).map(([mode, label]) => (
                <Pressable
                  key={mode}
                  disabled={busy}
                  onPress={() => update("mode", mode)}
                  style={[s.tab, draft.mode === mode && s.active]}
                >
                  <Text style={[s.tabText, draft.mode === mode && s.white]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={busy}
              style={s.hero}
              onPress={() => void pick()}
              accessibilityLabel="Chọn ảnh bìa món ăn"
            >
              {draft.image ? (
                <FoodImage
                  uri={draft.image}
                  style={s.photo}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ alignItems: "center", gap: 12 }}>
                  <ImagePlus size={44} color={accent} />
                  <Text style={s.tabText}>Thêm ảnh món ngon của bạn</Text>
                  <Text style={s.sub}>Chọn một ảnh bìa từ thư viện</Text>
                </View>
              )}
              <View style={s.badge}>
                <Text style={s.small}>✦ BẾP NHÀ MÌNH</Text>
              </View>
              <View style={s.photoButton}>
                <Camera size={19} color={accent} />
              </View>
              {!!draft.image && (
                <View style={s.caption}>
                  <Text style={[s.heading, s.white]}>Ảnh thành phẩm</Text>
                  <Text style={s.white}>Chạm để thay ảnh bìa</Text>
                </View>
              )}
            </Pressable>
            {!!draft.image && (
              <Pressable disabled={busy} onPress={() => update("image", "")}>
                <Text style={s.sub}>× Bỏ ảnh bìa</Text>
              </Pressable>
            )}
            <View style={[s.card, s.helper]}>
              <View style={s.row}>
                <Sparkles size={25} color={accent} />
                <View style={s.flex}>
                  <Text style={s.heading}>Viết công thức thật dễ</Text>
                  <Text style={s.sub}>
                    Một món ngon, một câu chuyện từ căn bếp của bạn.
                  </Text>
                </View>
              </View>
              <Pressable
                style={s.add}
                onPress={() => {
                  const missing = issues();
                  Alert.alert(
                    missing.length
                      ? "Nội dung cần bổ sung"
                      : "Bài viết đã sẵn sàng",
                    missing.length
                      ? missing.join("\n")
                      : "Bạn đã điền đủ thông tin cần thiết để chia sẻ.",
                  );
                }}
              >
                <Text style={s.small}>✓ Kiểm tra nội dung</Text>
              </Pressable>
            </View>
            <View style={s.card}>
              <Field
                label={
                  draft.mode === "recipe"
                    ? "Tên món ăn *"
                    : "Tiêu đề bài viết *"
                }
              >
                <TextInput
                  editable={!busy}
                  style={s.input}
                  value={draft.title}
                  onChangeText={(v) => update("title", v)}
                  maxLength={150}
                  placeholder="Ví dụ: Bò cuộn súp lơ baby đút lò"
                  placeholderTextColor="#A38D82"
                />
              </Field>
              <Field label="Mô tả / Cảm nghĩ của bạn *">
                <TextInput
                  editable={!busy}
                  style={[s.input, s.multiline]}
                  value={draft.description}
                  onChangeText={(v) => update("description", v)}
                  multiline
                  maxLength={3000}
                  placeholder="Chia sẻ câu chuyện và hương vị bạn yêu thích…"
                  placeholderTextColor="#A38D82"
                />
              </Field>
              <Field label="Phân loại">
                <View style={s.chips}>
                  {[
                    "🍲 Món Việt",
                    "🥗 Healthy",
                    "🍰 Bánh ngọt",
                    "⚡ Nấu nhanh",
                  ].map((c) => (
                    <Pressable
                      key={c}
                      disabled={busy}
                      onPress={() => update("category", c)}
                      style={[s.chip, draft.category === c && s.selected]}
                    >
                      <Text style={s.small}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
              <Field label="Hashtag">
                <TextInput
                  editable={!busy}
                  style={s.input}
                  value={draft.tags}
                  onChangeText={(v) => update("tags", v)}
                  maxLength={200}
                  placeholder="#BepNha #MonNgonMoiNgay"
                />
              </Field>
            </View>
            {draft.mode === "recipe" && (
              <>
                <View style={s.metrics}>
                  <View style={s.metric}>
                    <Clock3 color={accent} size={20} />
                    <Text style={[s.sub, s.metricLabel]}>Thời gian (phút)</Text>
                    <TextInput
                      editable={!busy}
                      style={s.number}
                      keyboardType="number-pad"
                      value={draft.minutes}
                      onChangeText={(v) => update("minutes", v)}
                      maxLength={4}
                    />
                  </View>
                  <View style={s.metric}>
                    <Users color="#A23A00" size={20} />
                    <Text style={[s.sub, s.metricLabel]}>Khẩu phần (người)</Text>
                    <TextInput
                      editable={!busy}
                      style={s.number}
                      keyboardType="number-pad"
                      value={draft.servings}
                      onChangeText={(v) => update("servings", v)}
                      maxLength={3}
                    />
                  </View>
                  <Pressable
                    disabled={busy}
                    style={s.metric}
                    onPress={() =>
                      update(
                        "difficulty",
                        draft.difficulty === "Dễ làm"
                          ? "Trung bình"
                          : draft.difficulty === "Trung bình"
                            ? "Nâng cao"
                            : "Dễ làm",
                      )
                    }
                  >
                    <ChefHat color={accent} size={20} />
                    <Text style={s.sub}>Độ khó</Text>
                    <Text style={s.tabText}>{draft.difficulty}</Text>
                    <Text style={s.sub}>Chạm để đổi</Text>
                  </Pressable>
                </View>
                <View style={s.card}>
                  <View style={s.row}>
                    <Leaf size={17} color={accent} />
                    <Text style={s.small}>Dinh dưỡng ước tính / khẩu phần</Text>
                  </View>
                  <View style={s.row}>
                    {(
                      [
                        ["calories", "Năng lượng", "kcal"],
                        ["protein", "Chất đạm", "g"],
                        ["carbs", "Tinh bột", "g"],
                        ["fat", "Chất béo", "g"],
                      ] as const
                    ).map(([field, label, unit]) => (
                      <View key={field} style={s.flex}>
                        <Text style={s.sub}>{label}</Text>
                        <TextInput
                          editable={!busy}
                          style={[
                            s.input,
                            { textAlign: "center", paddingHorizontal: 4 },
                          ]}
                          value={draft[field]}
                          onChangeText={(v) =>
                            update(field, v.replace(",", "."))
                          }
                          keyboardType="decimal-pad"
                          placeholder="—"
                          maxLength={6}
                        />
                        <Text style={s.sub}>{unit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={s.card}>
                  <View style={s.spread}>
                    <View style={s.flex}>
                      <Text style={s.heading}>Nguyên liệu chuẩn bị</Text>
                      <Text style={s.sub}>
                        Lượng dùng cho {draft.servings || "…"} người
                      </Text>
                    </View>
                    <Pressable
                      disabled={busy || draft.ingredients.length >= 20}
                      style={s.add}
                      onPress={() =>
                        update("ingredients", [
                          ...draft.ingredients,
                          { name: "", quantity: "", unit: "g" },
                        ])
                      }
                    >
                      <Text style={s.small}>+ Thêm</Text>
                    </Pressable>
                  </View>
                  {draft.ingredients.map((item, index) => (
                    <View key={index} style={s.ingredient}>
                      <View style={s.row}>
                        <Text style={s.small}>{index + 1}.</Text>
                        <TextInput
                          editable={!busy}
                          style={[s.input, s.flex]}
                          value={item.name}
                          maxLength={80}
                          placeholder="Tên nguyên liệu"
                          onChangeText={(v) =>
                            update(
                              "ingredients",
                              draft.ingredients.map((i, n) =>
                                n === index ? { ...i, name: v } : i,
                              ),
                            )
                          }
                        />
                        <Pressable
                          disabled={busy || draft.ingredients.length === 1}
                          style={s.icon}
                          onPress={() =>
                            update(
                              "ingredients",
                              draft.ingredients.filter((_, n) => n !== index),
                            )
                          }
                          accessibilityLabel="Xóa nguyên liệu"
                        >
                          <Trash2 size={16} color="#A38D82" />
                        </Pressable>
                      </View>
                      <View style={s.row}>
                        <Text style={s.sub}>Số lượng</Text>
                        <TextInput
                          editable={!busy}
                          style={[s.input, s.amount]}
                          value={item.quantity}
                          keyboardType="decimal-pad"
                          maxLength={8}
                          placeholder="300"
                          onChangeText={(v) =>
                            update(
                              "ingredients",
                              draft.ingredients.map((i, n) =>
                                n === index
                                  ? { ...i, quantity: v.replace(",", ".") }
                                  : i,
                              ),
                            )
                          }
                        />
                        <TextInput
                          editable={!busy}
                          style={[s.input, s.amount]}
                          value={item.unit}
                          maxLength={12}
                          placeholder="g"
                          onChangeText={(v) =>
                            update(
                              "ingredients",
                              draft.ingredients.map((i, n) =>
                                n === index ? { ...i, unit: v } : i,
                              ),
                            )
                          }
                        />
                      </View>
                    </View>
                  ))}
                  <Text style={s.small}>
                    💡 Đừng quên liệt kê gia vị và thành phần trong nước sốt.
                  </Text>
                </View>
                <View style={s.card}>
                  <View style={s.spread}>
                    <Text style={[s.heading, s.flex]}>
                      Hướng dẫn các bước nấu
                    </Text>
                    <Pressable
                      disabled={busy || draft.steps.length >= 10}
                      style={s.add}
                      onPress={() =>
                        update("steps", [
                          ...draft.steps,
                          { title: "", instruction: "" },
                        ])
                      }
                    >
                      <Text style={s.small}>+ Thêm bước</Text>
                    </Pressable>
                  </View>
                  {draft.steps.map((step, index) => (
                    <View key={index} style={s.step}>
                      <View style={s.row}>
                        <View style={s.stepNumber}>
                          <Text style={s.white}>{index + 1}</Text>
                        </View>
                        <TextInput
                          editable={!busy}
                          style={[s.tabText, s.flex]}
                          value={step.title}
                          maxLength={60}
                          placeholder={"Tên bước " + (index + 1)}
                          onChangeText={(v) =>
                            update(
                              "steps",
                              draft.steps.map((i, n) =>
                                n === index ? { ...i, title: v } : i,
                              ),
                            )
                          }
                        />
                        <Pressable
                          disabled={busy || draft.steps.length === 1}
                          onPress={() =>
                            update(
                              "steps",
                              draft.steps.filter((_, n) => n !== index),
                            )
                          }
                          style={s.icon}
                          accessibilityLabel="Xóa bước nấu"
                        >
                          <Trash2 size={16} color="#A38D82" />
                        </Pressable>
                      </View>
                      <TextInput
                        editable={!busy}
                        style={[s.input, s.multiline]}
                        multiline
                        value={step.instruction}
                        maxLength={500}
                        placeholder="Mô tả cách làm, thời gian và nhiệt độ nếu cần…"
                        onChangeText={(v) =>
                          update(
                            "steps",
                            draft.steps.map((i, n) =>
                              n === index ? { ...i, instruction: v } : i,
                            ),
                          )
                        }
                      />
                    </View>
                  ))}
                  <Field label="Mẹo nhỏ của đầu bếp">
                    <TextInput
                      editable={!busy}
                      style={[s.input, s.multiline]}
                      value={draft.tip}
                      onChangeText={(v) => update("tip", v)}
                      multiline
                      maxLength={500}
                      placeholder="Bí quyết giúp món ăn ngon hơn…"
                    />
                  </Field>
                </View>
              </>
            )}
            <View style={s.card}>
              <Text style={s.heading}>Cài đặt hiển thị & Chia sẻ</Text>
              <View style={s.chips}>
                {([['PUBLIC', 'Công khai'], ['PRIVATE', 'Chỉ mình tôi']] as const).map(([value, label]) => (
                  <Pressable key={value} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: draft.visibility === value }}
                    style={[s.chip, s.row, draft.visibility === value && s.selected]} onPress={() => update('visibility', value)}>
                    {value === 'PUBLIC' ? <Globe size={17} color={accent} /> : <Lock size={17} color={accent} />}
                    <Text style={s.tabText}>{label}</Text>
                    {draft.visibility === value && <Check size={15} color={accent} />}
                  </Pressable>
                ))}
              </View>
              <Text style={s.sub}>
                {draft.visibility === 'PUBLIC' ? 'Mọi người trong cộng đồng có thể xem bài viết.' : 'Bài viết cá nhân chỉ hiển thị với tài khoản của bạn.'}
              </Text>
              <Pressable
                disabled={busy}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: accepted }}
                onPress={() => setAccepted((v) => !v)}
                style={s.row}
              >
                <View style={[s.check, accepted && s.active]}>
                  {accepted && <Check size={15} color="white" />}
                </View>
                <Text style={[s.sub, s.flex]}>
                  Tôi xác nhận nội dung do mình chia sẻ và có quyền sử dụng ảnh
                  trong bài.
                </Text>
              </Pressable>
              <View style={s.row}>
                <ShieldCheck size={16} color={accent} />
                <Text style={[s.sub, s.flex]}>
                  Kiểm tra thông tin trước khi chia sẻ với cộng đồng.
                </Text>
              </View>
            </View>
          </ScrollView>
          <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Pressable
              disabled={busy}
              onPress={() => void saveDraft()}
              style={[s.secondary, busy && s.disabled]}
            >
              <Text style={s.tabText}>Lưu nháp</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => void submit()}
              style={[s.button, busy && s.disabled]}
            >
              {busy ? (
                <ActivityIndicator color="white" />
              ) : (
                <Send size={18} color="white" />
              )}
              <Text style={s.buttonText}>
                {busy ? "Đang xử lý…" : draft.visibility === "PRIVATE" ? "Lưu bài cá nhân" : "Chia sẻ cùng Cộng đồng"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
