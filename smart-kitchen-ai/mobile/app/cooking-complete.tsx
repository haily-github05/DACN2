// Trang: Hoàn thành nấu ăn — xác nhận khẩu phần và lưu lịch sử món đã nấu.
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { getRecipes, kitchenRequest, KitchenRecipe } from "../lib/kitchenApi";
import AppHeader from "../components/AppHeader";
import FoodImage from "../components/FoodImage";
import { cookingStyles as s } from "../components/cookingStyles";

export default function CookingCompleteScreen() {
  const { id, servings: requestedServings } = useLocalSearchParams<{ id?: string; servings?: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<KitchenRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const submitting = useRef(false);
  const count = Number(requestedServings);
  const servings = Number.isInteger(count) && count >= 1 && count <= 10 ? count : 1;
  useEffect(() => {
    let active = true;
    getRecipes().then(rows => {
      const found = rows.find(r => r.id === id);
      if (!found) throw new Error("Không tìm thấy món ăn theo thiết lập hiện tại.");
      if (active) setRecipe(found);
    }).catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retry]);
  const save = async () => {
    if (!recipe || submitting.current || saved) return;
    submitting.current = true;
    setSaving(true);
    try {
      await kitchenRequest("cooking", "POST", { recipeId: recipe.id, servings, rating, note });
      setSaved(true);
    } catch (err) {
      submitting.current = false;
      Alert.alert("Không thể lưu lịch sử", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally { setSaving(false); }
  };
  return <SafeAreaView style={s.page} edges={["left", "right", "bottom"]}>
    <AppHeader />
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>{saved ? "Đã lưu món bạn nấu" : "Món ăn đã hoàn thành!"}</Text>
      {loading ? <ActivityIndicator color="#A23A00" style={s.loader} /> : error ? <>
        <Text style={s.body}>{error}</Text>
        <Pressable style={s.button} onPress={() => { setLoading(true); setError(""); setRetry(n => n + 1); }}><Text style={s.buttonText}>Thử lại</Text></Pressable>
      </> : recipe && <>
        <FoodImage uri={recipe.image} style={s.photo} resizeMode="cover" accessibilityLabel={recipe.name} />
        <View style={s.card}>
          <Text style={s.cardTitle}>{recipe.name}</Text>
          <Text style={s.body}>Khẩu phần: {servings} người</Text>
          <Text style={s.body}>Năng lượng ước tính: {recipe.calories == null ? "Chưa có dữ liệu" : `${recipe.calories * servings} kcal tổng`}</Text>
          <Text style={s.muted}>{saved ? "Món ăn và số người ăn đã được ghi vào lịch sử nấu ăn." : "Xác nhận lưu món vừa nấu vào lịch sử của bạn."}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardTitle}>Đánh giá món ăn (tùy chọn)</Text>
          <View style={s.row}>{[1,2,3,4,5].map(value => (
            <Pressable key={value} disabled={saving || saved} accessibilityLabel={value + " sao"}
              onPress={() => setRating(prev => prev === value ? null : value)} style={{padding:6}}>
              <Text style={{fontSize:30,color:rating !== null && value <= rating ? "#A23A00" : "#D9C8BF"}}>★</Text>
            </Pressable>
          ))}</View>
          <Text style={s.muted}>{rating ? `${rating}/5 sao` : "Chưa đánh giá"}</Text>
          <Text style={s.cardTitle}>Ghi chú cho lần nấu sau</Text>
          <TextInput editable={!saving && !saved} value={note} onChangeText={setNote} multiline maxLength={2000}
            placeholder="Ví dụ: Giảm muối, áp chảo thêm 2 phút…"
            style={{minHeight:100,padding:12,borderWidth:1,borderColor:"#EED9CF",borderRadius:12,textAlignVertical:"top",color:"#201A17"}} />
        </View>
        <Pressable disabled={saving || saved} onPress={() => void save()} style={[s.button, (saving || saved) && s.disabled]}>
          {saved && <CheckCircle2 color="white" size={20} />}
          <Text style={s.buttonText}>{saved ? "Đã lưu lịch sử" : saving ? "Đang lưu…" : "Xác nhận lưu món đã nấu"}</Text>
        </Pressable>
        {!saved && <Pressable disabled={saving} onPress={() => router.back()}><Text style={s.link}>Quay lại các bước nấu</Text></Pressable>}
      </>}
      {saved && <Pressable onPress={() => router.replace({ pathname: "/my-activity", params: { tab: "cooked" } })}><Text style={s.link}>Xem lịch sử vừa lưu</Text></Pressable>}
      <Pressable disabled={saving} onPress={() => router.replace("/recipes")}><Text style={s.link}>{saved ? "Khám phá món tiếp theo" : "Về danh sách công thức"}</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
