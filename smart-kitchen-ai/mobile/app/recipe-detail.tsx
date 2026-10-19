import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  RotateCcw,
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
  calories: number;
  ingredients: Ingredient[];
  steps: {
    title: string;
    description: string;
  }[];
};

const DEFAULT_RECIPE: RecipeData = {
  name: "Ức gà áp chảo sốt tiêu đen",
  description: "Mềm thơm, đậm vị, dễ làm ngay tại nhà.",
  image:
    "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=900&auto=format&fit=crop",
  minutes: 25,
  calories: 420,
  ingredients: [
    { id: "1", name: "Ức gà", amount: 300, unit: "g", available: true },
    { id: "2", name: "Tiêu đen", amount: 1, unit: "thìa", available: true },
    { id: "3", name: "Tỏi", amount: 2, unit: "tép", available: true },
    { id: "4", name: "Dầu ô liu", amount: 1, unit: "thìa", available: true },
    {
      id: "5",
      name: "Bông cải xanh",
      amount: 150,
      unit: "g",
      available: false,
    },
  ],
  steps: [
    {
      title: "Sơ chế nguyên liệu",
      description:
        "Rửa sạch ức gà, thấm khô bằng khăn giấy. Băm nhỏ tỏi và chuẩn bị gia vị.",
    },
    {
      title: "Ướp gia vị",
      description:
        "Ướp ức gà với tỏi, tiêu đen và một ít dầu ô liu trong khoảng 10 phút.",
    },
    {
      title: "Áp chảo chín vàng",
      description:
        "Làm nóng chảo, áp chảo gà khoảng 5–7 phút mỗi mặt. Kiểm tra thịt chín kỹ trước khi dùng.",
    },
    {
      title: "Trình bày và thưởng thức",
      description:
        "Để thịt nghỉ khoảng 3 phút, sau đó thái lát và dùng cùng rau củ.",
    },
  ],
};

const OTHER_RECIPES: Record<string, Partial<RecipeData>> = {
  "Trứng cuộn rau củ": {
    description: "Bữa sáng nhanh gọn, đầy màu sắc và bổ dưỡng.",
    image:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&auto=format&fit=crop",
    minutes: 10,
    calories: 240,
    ingredients: [
      { id: "1", name: "Trứng gà", amount: 3, unit: "quả", available: true },
      { id: "2", name: "Cà rốt", amount: 50, unit: "g", available: true },
      { id: "3", name: "Hành lá", amount: 20, unit: "g", available: false },
      { id: "4", name: "Dầu ăn", amount: 1, unit: "thìa", available: true },
    ],
    steps: [
      {
        title: "Chuẩn bị rau củ",
        description: "Rửa sạch và thái nhỏ cà rốt, hành lá.",
      },
      {
        title: "Đánh trứng",
        description: "Đánh đều trứng với rau củ và một ít gia vị.",
      },
      {
        title: "Chiên và cuộn",
        description: "Đổ trứng thành lớp mỏng, cuộn khi vừa chín.",
      },
      {
        title: "Thưởng thức",
        description: "Cắt thành khoanh vừa ăn và dùng khi còn nóng.",
      },
    ],
  },
  "Salad rau củ": {
    description: "Món ăn thanh mát, dễ chuẩn bị.",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&auto=format&fit=crop",
    minutes: 12,
    calories: 210,
    ingredients: [
      { id: "1", name: "Xà lách", amount: 150, unit: "g", available: true },
      { id: "2", name: "Cà chua", amount: 2, unit: "quả", available: true },
      { id: "3", name: "Dưa leo", amount: 1, unit: "quả", available: false },
      { id: "4", name: "Dầu ô liu", amount: 1, unit: "thìa", available: true },
    ],
    steps: [
      {
        title: "Rửa rau củ",
        description: "Rửa sạch và để ráo tất cả nguyên liệu.",
      },
      {
        title: "Sơ chế",
        description: "Cắt cà chua, dưa leo và xà lách vừa ăn.",
      },
      {
        title: "Trộn salad",
        description: "Trộn rau củ cùng dầu ô liu và gia vị.",
      },
    ],
  },
};

export default function RecipeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
  }>();

  const requestedName = typeof params.name === "string" ? params.name : "";

  const recipe = useMemo<RecipeData>(() => {
    const custom = OTHER_RECIPES[requestedName];

    if (custom) {
      return {
        ...DEFAULT_RECIPE,
        ...custom,
        name: requestedName,
      };
    }

    return {
      ...DEFAULT_RECIPE,
      name: requestedName || DEFAULT_RECIPE.name,
    };
  }, [requestedName]);

  const [servings, setServings] = useState(2);
  const [favorite, setFavorite] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [cooking, setCooking] = useState(false);

  const ingredients = recipe.ingredients;

  const availableCount = ingredients.filter((item) => item.available).length;

  const missingCount = ingredients.length - availableCount;

  const progress = Math.round(
    (availableCount / Math.max(ingredients.length, 1)) * 100,
  );

  const stepProgress = Math.round(
    (completedSteps.length / Math.max(recipe.steps.length, 1)) * 100,
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

  const toggleStep = (index: number) => {
    setCompletedSteps((previous) =>
      previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index],
    );
  };

  const startCooking = () => {
    if (!cooking) {
      setCooking(true);
      Alert.alert(
        "Bắt đầu nấu ăn",
        "Bạn có thể đánh dấu từng bước đã hoàn thành trong phần hướng dẫn.",
      );
      return;
    }

    if (completedSteps.length === recipe.steps.length) {
      Alert.alert(
        "Hoàn thành món ăn! 🎉",
        `Bạn đã hoàn thành món ${recipe.name}.`,
        [
          {
            text: "Nấu lại",
            onPress: () => {
              setCompletedSteps([]);
              setCooking(false);
            },
          },
          {
            text: "Xong",
            onPress: () => router.push("/recipes" as any),
          },
        ],
      );
    } else {
      Alert.alert(
        "Tiếp tục nấu ăn",
        `Bạn đã hoàn thành ${completedSteps.length}/${recipe.steps.length} bước.`,
      );
    }
  };

  const formatAmount = (amount: number) => {
    const scaled = (amount * servings) / 2;
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
          onPress={() => setFavorite((value) => !value)}
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
          <Image
            source={{ uri: recipe.image }}
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
              {Math.round((recipe.calories * servings) / 2)}
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

        {cooking && (
          <View style={styles.cookingProgress}>
            <View style={styles.cookingProgressHeader}>
              <Text style={styles.cookingProgressTitle}>Tiến độ nấu ăn</Text>
              <Text style={styles.cookingProgressValue}>{stepProgress}%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${stepProgress}%` }]}
              />
            </View>
          </View>
        )}

        {recipe.steps.map((step, index) => {
          const done = completedSteps.includes(index);

          return (
            <Pressable
              key={index}
              style={styles.stepCard}
              onPress={() => {
                if (!cooking) {
                  setCooking(true);
                }
                toggleStep(index);
              }}
            >
              <View style={[styles.stepNumber, done && styles.stepNumberDone]}>
                {done ? (
                  <Check size={18} color={C.white} />
                ) : (
                  <Text style={styles.stepNumberText}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                )}
              </View>

              <View style={styles.stepInfo}>
                <Text style={[styles.stepTitle, done && { color: C.green }]}>
                  {step.title}
                </Text>

                <Text style={styles.stepDescription}>{step.description}</Text>

                <Text style={styles.stepHint}>
                  {done ? "✓ Đã hoàn thành" : "Chạm để đánh dấu hoàn thành"}
                </Text>
              </View>
            </Pressable>
          );
        })}

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
        <Pressable style={styles.startButton} onPress={startCooking}>
          {cooking ? (
            <RotateCcw size={18} color={C.white} />
          ) : (
            <Play size={18} color={C.white} />
          )}

          <Text style={styles.startButtonText}>
            {!cooking
              ? "Bắt đầu nấu ăn"
              : completedSteps.length === recipe.steps.length
                ? "Hoàn thành món ăn"
                : `Đang nấu · ${completedSteps.length}/${recipe.steps.length} bước`}
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
