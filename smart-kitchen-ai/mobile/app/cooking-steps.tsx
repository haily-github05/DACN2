// Trang: Đang nấu ăn — nguyên liệu theo khẩu phần và tiến độ từng bước.
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Check, ChefHat } from "lucide-react-native";
import AppHeader from "../components/AppHeader";
import { getRecipes, KitchenRecipe } from "../lib/kitchenApi";
import { cookingStyles as s } from "../components/cookingStyles";

export default function CookingStepsScreen() {
  const { id, servings: requestedServings } = useLocalSearchParams<{ id?: string; servings?: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<KitchenRecipe | null>(null);
  const [servings, setServings] = useState(1);
  const [completed, setCompleted] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    getRecipes().then(rows => {
      const found = rows.find(r => r.id === id);
      if (!found) throw new Error("Không tìm thấy món phù hợp với thiết lập hiện tại.");
      if (!found.steps.length) throw new Error("Món này chưa có hướng dẫn chế biến.");
      const count = Number(requestedServings);
      if (active) {
        setRecipe(found);
        setServings(Number.isInteger(count) && count >= 1 && count <= 10 ? count : found.defaultServings);
      }
    }).catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, requestedServings, retry]);
  const toggle = (index: number) => setCompleted(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  const allDone = !!recipe?.steps.length && completed.length === recipe.steps.length;
  const leave = () => {
    const back = () => router.canGoBack() ? router.back() : router.replace("/recipes");
    if (completed.length) Alert.alert("Dừng nấu ăn?", "Tiến độ của lượt nấu này sẽ không được lưu.", [{ text: "Tiếp tục nấu", style: "cancel" }, { text: "Dừng nấu", onPress: back }]);
    else back();
  };
  return <SafeAreaView style={s.page} edges={["left", "right", "bottom"]}>
    <AppHeader />
    <View style={s.heading}><Pressable onPress={leave} accessibilityLabel="Quay lại" style={s.iconButton}><ArrowLeft color="#A23A00" /></Pressable><Text style={s.headingTitle}>Đang nấu ăn</Text></View>
    {loading ? <ActivityIndicator color="#A23A00" style={s.loader} /> : error ? <View style={s.content}>
      <Text style={s.body}>{error}</Text>
      <Pressable onPress={() => { setLoading(true); setError(""); setRetry(n => n + 1); }} style={s.button}><Text style={s.buttonText}>Thử lại</Text></Pressable>
      <Pressable onPress={() => router.replace("/recipes")}><Text style={s.link}>Chọn công thức khác</Text></Pressable>
    </View> : recipe && <>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{recipe.name}</Text>
        <Text style={s.body}>{servings} người · {recipe.minutes} phút dự kiến</Text>
        <View style={s.card}><Text style={s.cardTitle}>Nguyên liệu cho {servings} người</Text>
          {recipe.ingredients.map(i => <Text key={i.id} style={s.body}>{i.name} · {Number((i.amount * servings / recipe.defaultServings).toFixed(2))} {i.unit}</Text>)}
        </View>
        <Text style={s.cardTitle}>Đã xong {completed.length}/{recipe.steps.length} bước</Text>
        <View style={s.track}><View style={[s.progress, { width: `${completed.length / recipe.steps.length * 100}%` }]} /></View>
        <Text style={s.muted}>Chạm vào từng bước khi bạn thực hiện xong.</Text>
        {recipe.steps.map((step, index) => {
          const done = completed.includes(index);
          return <Pressable key={index} accessibilityRole="checkbox" accessibilityState={{ checked: done }} onPress={() => toggle(index)} style={[s.card, done && s.doneCard]}>
            <View style={s.row}><View style={[s.stepNumber, done && s.doneNumber]}>{done ? <Check size={18} color="white" /> : <Text style={s.link}>{index + 1}</Text>}</View><Text style={s.cardTitle}>{step.title}</Text></View>
            <Text style={s.body}>{step.description}</Text>
            <Text style={s.muted}>{done ? "Đã hoàn thành · Chạm để bỏ đánh dấu" : "Chưa hoàn thành"}</Text>
          </Pressable>;
        })}
      </ScrollView>
      <View style={s.footer}><Pressable disabled={!allDone} style={[s.button, !allDone && s.disabled]} onPress={() => router.push({ pathname: "/cooking-complete", params: { id: recipe.id, servings: String(servings) } })}>
        <ChefHat size={20} color="white" /><Text style={s.buttonText}>{allDone ? "Hoàn thành món ăn" : `Còn ${recipe.steps.length - completed.length} bước`}</Text>
      </Pressable></View>
    </>}
  </SafeAreaView>;
}
