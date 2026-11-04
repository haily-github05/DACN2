// Trang: Chi tiết công thức — nguyên liệu, khẩu phần, calo và hướng dẫn.
import FoodImage from "../components/FoodImage";
import { useRecipeFavorites } from "../hooks/useRecipeFavorites";
import { getRecipes } from "../lib/kitchenApi";
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Heart,
  Clock3,
  Flame,
  Users,
  Minus,
  Plus,
  Check,
  ShoppingCart,
  Sparkles,
  ChefHat,
  ChevronRight,
  Play,
  CheckCircle2,
  Leaf,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

const C = {
  orange: "#A23A00",
  deep: "#842D00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  green: "#397C57",
  mint: "#E9F5EB",
};

type Ingredient = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  available: boolean;
};

type RecipeData = {
  name: string;
  description: string;
  image: string;
  minutes: number;
  calories: number | null;
  defaultServings: number;
  preferenceInfo?: { ingredientDataAvailable: boolean; dislikedIngredients: string[] };
  ingredients: Ingredient[];
  steps: {
    title: string;
    description: string;
  }[];
};

export default function RecipeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
  }>();

  const requestedName = typeof params.name === "string" ? params.name : "";

  const [servings, setServings] = useState(1);
  const [recipeId, setRecipeId] = useState("");
  const [recipe, setRecipe] = useState<RecipeData>({ name: "Đang tải công thức", description: "", image: "", minutes: 0, calories: null, defaultServings: 1, ingredients: [], steps: [] });
  useFocusEffect(useCallback(() => {
    let active = true;
    setRecipeId("");
    setRecipe({ name: "Đang kiểm tra công thức theo khẩu vị", description: "", image: "", minutes: 0, calories: null, defaultServings: 1, ingredients: [], steps: [] });
    getRecipes().then(rows => {
      const found = params.id ? rows.find(r => r.id === params.id) : rows.find(r => r.name === requestedName);
      if (!found) throw new Error("Công thức không còn được gợi ý theo thiết lập hiện tại hoặc chưa đủ dữ liệu nguyên liệu");
      if (active) { setRecipe(found); setRecipeId(found.id); setServings(found.defaultServings); }
    }).catch(error => Alert.alert("Không thể tải công thức", error.message));
    return () => { active = false; };
  }, [params.id, requestedName]));

  const { favorites, toggleFavorite } = useRecipeFavorites();
  const favorite = favorites.includes(recipeId);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const ingredients = recipe.ingredients;

  const availableCount = ingredients.filter((item) => item.available).length;

  const missingCount = ingredients.length - availableCount;

  const progress = Math.round(
    (availableCount / Math.max(ingredients.length, 1)) * 100,
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/recipes" as any);
    }
  };

  const toggleIngredient = (id: string) => {
    setCheckedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const startCooking = () => {
    if (!recipeId || !recipe.steps.length) return;
    const open = () => router.push({ pathname: "/cooking-steps", params: { id: recipeId, servings: String(servings) } });
    if (missingCount > 0) {
      Alert.alert("Kiểm tra nguyên liệu", `Kho hiện thiếu ${missingCount} nguyên liệu theo công thức gốc. Hãy chuẩn bị đủ nguyên liệu cho ${servings} người trước khi nấu.`, [
        { text: "Kiểm tra lại", style: "cancel" },
        { text: "Đã chuẩn bị, bắt đầu", onPress: open },
      ]);
    } else open();
  };

  const formatAmount = (amount: number) => {
    const scaled = (amount * servings) / recipe.defaultServings;
    return Number.isInteger(scaled)
      ? String(scaled)
      : String(Number(scaled.toFixed(2)));
  };

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      <AppHeader />

      {/* THANH TIÊU ĐỀ */}
      <View style={styles.pageHeader}>
        <Pressable style={styles.iconButton} onPress={goBack}>
          <ArrowLeft size={21} color={C.orange} />
        </Pressable>

        <Text style={styles.pageTitle}>Chi tiết công thức</Text>

        <Pressable
          style={styles.iconButton}
          onPress={() => { if (recipeId) void toggleFavorite(recipeId); }}
        >
          <Heart
            size={21}
            color={favorite ? "#E54848" : C.orange}
            fill={favorite ? "#E54848" : "transparent"}
          />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ẢNH MÓN ĂN */}
        <View style={styles.heroCard}>
          <FoodImage
            uri={recipe.image}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.aiBadge}>
            <Sparkles size={13} color={C.orange} />
            <Text style={styles.aiBadgeText}>CHEF AI</Text>
          </View>

          <View style={styles.matchBadge}>
            <CheckCircle2 size={14} color={C.green} />
            <Text style={styles.matchBadgeText}>Có sẵn {progress}%</Text>
          </View>
        </View>

        {/* TÊN MÓN */}
        <Text style={styles.recipeTitle}>{recipe.name}</Text>

        <Text style={styles.recipeDescription}>{recipe.description}</Text>
        {recipe.preferenceInfo && !recipe.preferenceInfo.ingredientDataAvailable && (
          <Text style={styles.recipeDescription}>Chưa có dữ liệu nguyên liệu để đối chiếu dị ứng.</Text>
        )}
        {!!recipe.preferenceInfo?.dislikedIngredients.length && (
          <Text style={styles.recipeDescription}>
            Có nguyên liệu bạn không thích: {recipe.preferenceInfo.dislikedIngredients.join(", ")}.
          </Text>
        )}


        {/* THÔNG TIN MÓN */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Clock3 size={21} color={C.orange} />
            <Text style={styles.statValue}>{recipe.minutes} phút</Text>
            <Text style={styles.statLabel}>Thời gian</Text>
          </View>

          <View style={styles.statCard}>
            <Flame size={21} color={C.orange} />
            <Text style={styles.statValue}>
              {recipe.calories == null ? "—" : Math.round(recipe.calories * servings)}
            </Text>
            <Text style={styles.statLabel}>kcal tổng</Text>
          </View>

          <View style={styles.statCard}>
            <Users size={21} color={C.orange} />
            <Text style={styles.statValue}>{servings} người</Text>
            <Text style={styles.statLabel}>Khẩu phần</Text>
          </View>
        </View>

        {/* TRẠNG THÁI NGUYÊN LIỆU */}
        <View style={styles.pantryStatus}>
          <View style={styles.statusHeading}>
            <CheckCircle2 size={20} color={C.green} />
            <Text style={styles.statusTitle}>Nguyên liệu sẵn có</Text>
          </View>

          <Text style={styles.statusText}>
            {availableCount}/{ingredients.length} nguyên liệu
            {" · "}
            Thiếu {missingCount} nguyên liệu
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          {missingCount > 0 && (
            <Pressable
              style={styles.shoppingLink}
              onPress={() => router.push("/shopping-list" as any)}
            >
              <ShoppingCart size={15} color={C.orange} />
              <Text style={styles.shoppingLinkText}>Xem danh sách mua sắm</Text>
              <ChevronRight size={16} color={C.orange} />
            </Pressable>
          )}
        </View>

        {/* NGUYÊN LIỆU */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Nguyên liệu cần chuẩn bị</Text>

          <Text style={styles.sectionCount}>
            {ingredients.length} nguyên liệu
          </Text>
        </View>

        {/* CHỌN KHẨU PHẦN */}
        <View style={styles.servingsRow}>
          <Text style={styles.servingsLabel}>Số người ăn</Text>

          <View style={styles.servingsControls}>
            <Pressable
              style={styles.servingButton}
              onPress={() => setServings((value) => Math.max(1, value - 1))}
            >
              <Minus size={17} color={C.orange} />
            </Pressable>

            <Text style={styles.servingsValue}>{servings}</Text>

            <Pressable
              style={styles.servingButton}
              onPress={() => setServings((value) => Math.min(10, value + 1))}
            >
              <Plus size={17} color={C.orange} />
            </Pressable>
          </View>
        </View>

        <View style={styles.ingredientsCard}>
          {ingredients.map((item, index) => {
            const checked = checkedIds.includes(item.id);

            return (
              <Pressable
                key={item.id}
                style={[
                  styles.ingredientRow,
                  index < ingredients.length - 1 && styles.ingredientBorder,
                ]}
                onPress={() => toggleIngredient(item.id)}
              >
                <View
                  style={[styles.checkbox, checked && styles.checkboxActive]}
                >
                  {checked && <Check size={15} color={C.white} />}
                </View>

                <View style={styles.ingredientInfo}>
                  <Text
                    style={[
                      styles.ingredientName,
                      checked && styles.checkedText,
                    ]}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={[
                      styles.ingredientStatus,
                      {
                        color: item.available ? C.green : C.orange,
                      },
                    ]}
                  >
                    {item.available ? "Có sẵn" : "Cần mua"}
                  </Text>
                </View>

                <Text style={styles.ingredientQuantity}>
                  {formatAmount(item.amount)} {item.unit}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* CÁC BƯỚC CHẾ BIẾN */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Các bước chế biến</Text>

          <Text style={styles.sectionCount}>{recipe.steps.length} bước</Text>
        </View>

        {recipe.steps.length === 0 && (
          <Text style={styles.recipeDescription}>Món này chưa có hướng dẫn chế biến.</Text>
        )}
        {recipe.steps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{String(index + 1).padStart(2, "0")}</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}

        {/* MẸO */}
        <View style={styles.tipCard}>
          <ChefHat size={21} color={C.green} />

          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Mẹo từ Chef AI</Text>

            <Text style={styles.tipDescription}>
              Chuẩn bị nguyên liệu trước khi nấu để tiết kiệm thời gian và tránh
              bỏ sót bước.
            </Text>
          </View>
        </View>

        <View style={styles.ecoRow}>
          <Leaf size={16} color={C.green} />
          <Text style={styles.ecoText}>
            Nấu ngon hơn, giảm lãng phí cùng Smart Kitchen AI
          </Text>
        </View>
      </ScrollView>

      {/* NÚT NẤU ĂN */}
      <View style={styles.bottomAction}>
        <Pressable
          disabled={!recipeId || !recipe.steps.length}
          style={[styles.startButton, (!recipeId || !recipe.steps.length) && { opacity: 0.5 }]}
          onPress={startCooking}
        >
          <Play size={18} color={C.white} />
          <Text style={styles.startButtonText}>
            {recipeId && !recipe.steps.length ? "Chưa có hướng dẫn nấu" : "Bắt đầu nấu ăn"}
          </Text>

          <ChevronRight size={18} color={C.white} />
        </Pressable>
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
  pageHeader: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: C.dark,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 20,
  },
  heroCard: {
    height: 220,
    borderRadius: 18,
    backgroundColor: C.peach,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  aiBadge: {
    position: "absolute",
    top: 13,
    left: 13,
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  aiBadgeText: {
    color: C.orange,
    fontSize: 10,
    fontWeight: "800",
  },
  matchBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: C.mint,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchBadgeText: {
    color: C.green,
    fontSize: 10,
    fontWeight: "800",
  },
  recipeTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
    color: C.dark,
    marginTop: 16,
  },
  recipeDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },
  statLabel: {
    fontSize: 10,
    color: C.muted,
  },
  pantryStatus: {
    backgroundColor: C.mint,
    borderRadius: 14,
    padding: 14,
    marginBottom: 22,
  },
  statusHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.green,
  },
  statusText: {
    fontSize: 11,
    color: C.green,
    marginTop: 9,
  },
  progressTrack: {
    height: 7,
    borderRadius: 6,
    backgroundColor: "#D6E8D8",
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.green,
    borderRadius: 6,
  },
  shoppingLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  shoppingLinkText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.orange,
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
    flexShrink: 1,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: "800",
    color: C.orange,
  },
  servingsRow: {
    backgroundColor: C.peach,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
  },
  servingsLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
  },
  servingsControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  servingButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  servingsValue: {
    fontSize: 14,
    fontWeight: "800",
    color: C.orange,
  },
  ingredientsCard: {
    backgroundColor: C.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  ingredientRow: {
    minHeight: 63,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 9,
  },
  ingredientBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
  },
  checkedText: {
    textDecorationLine: "line-through",
    color: C.muted,
  },
  ingredientStatus: {
    fontSize: 10,
    marginTop: 5,
  },
  ingredientQuantity: {
    fontSize: 11,
    fontWeight: "800",
    color: C.orange,
  },
  cookingProgress: {
    backgroundColor: C.mint,
    borderRadius: 12,
    padding: 13,
    marginBottom: 13,
  },
  cookingProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cookingProgressTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.green,
  },
  cookingProgressValue: {
    fontSize: 12,
    fontWeight: "800",
    color: C.green,
  },
  stepCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
  },
  stepNumber: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberDone: {
    backgroundColor: C.green,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.orange,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 11,
    lineHeight: 18,
    color: C.muted,
  },
  stepHint: {
    fontSize: 10,
    fontWeight: "700",
    color: C.green,
    marginTop: 9,
  },
  tipCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: C.mint,
    borderRadius: 14,
    padding: 14,
    marginTop: 9,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.green,
  },
  tipDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: C.green,
    marginTop: 5,
  },
  ecoRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
  },
  ecoText: {
    fontSize: 10,
    color: C.green,
  },
  bottomAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  startButton: {
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: C.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
  },
});
