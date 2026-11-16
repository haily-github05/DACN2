import RequireLogin from "../components/RequireLogin";
import { suggestMeal } from "../lib/mealSuggestions";
// Trang: Thực đơn — lập kế hoạch các bữa ăn theo ngày và tuần.
import { sortRecipesByName } from "../lib/recipeOrder";
import { getRecipes, kitchenRequest } from "../lib/kitchenApi";
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChefHat,
  RefreshCw,
  Plus,
  Minus,
  ShoppingCart,
  Sun,
  Sunset,
  Moon,
  CalendarDays,
  Lock,
  LockOpen,
  Trash2,
  Eye,
  Utensils,
  X,
  Check,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import FoodImage from "../components/FoodImage";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  green: "#397C57",
  greenLight: "#E9F5EB",
  blueLight: "#EDF3FF",
};

type MealType = "breakfast" | "lunch" | "dinner";

type Recipe = {
  id: string;
  name: string;
  minutes: number;
  calories: number | null;
  category?: string;
  servings?: number;
  image?: string;
  ingredients?: { id: string; name: string; amount?: number; unit?: string; available: boolean }[];
};

type DayPlan = Record<MealType, Recipe[]>;
type Plans = Record<string, DayPlan>;

const MEALS: {
  key: MealType;
  label: string;
  time: string;
  icon: typeof Sun;
  background: string;
}[] = [
  {
    key: "breakfast",
    label: "Bữa sáng",
    time: "07:00",
    icon: Sun,
    background: C.greenLight,
  },
  {
    key: "lunch",
    label: "Bữa trưa",
    time: "12:00",
    icon: Sunset,
    background: C.peach,
  },
  {
    key: "dinner",
    label: "Bữa tối",
    time: "18:30",
    icon: Moon,
    background: C.blueLight,
  },
];

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  result.setHours(12, 0, 0, 0);
  return result;
}

function addDays(date: Date, count: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateRange(start: string, count: number) {
  const first = new Date(`${start}T12:00:00`);
  return Array.from({ length: count }, (_, index) => dateKey(addDays(first, index)));
}

function draftLockKey(day: string, type: MealType, recipeId: string) {
  return `${day}:${type}:${recipeId}`;
}

function formatDate(date: Date) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function emptyDay(): DayPlan {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
  };
}

function MealPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

  const [plans, setPlans] = useState<Plans>({});
  const [people, setPeople] = useState(2);
  const [planDays, setPlanDays] = useState(1);
  const [generation, setGeneration] = useState(0);
  const [recipeOptions, setRecipeOptions] = useState<Recipe[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [previewPlan, setPreviewPlan] = useState<Plans | null>(null);
  const [lockedRecipeKeys, setLockedRecipeKeys] = useState<string[]>([]);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [alternativeOptions, setAlternativeOptions] = useState<Recipe[]>([]);
  const [alternativeTarget, setAlternativeTarget] = useState<{ date: string; type: MealType; index?: number } | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const busy = saving || generating;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoaded(false);
      setRecipeOptions([]);
      setPlans({});
      Promise.all([kitchenRequest<Plans>("plans"), getRecipes()])
        .then(([data, recipes]) => {
          if (active) {
            setPlans(data);
            setRecipeOptions(
              recipes.some((r) => !r.preferenceInfo?.dislikedIngredients.length)
                ? recipes.filter(
                    (r) => !r.preferenceInfo?.dislikedIngredients.length,
                  )
                : recipes,
            );
            setLoaded(true);
          }
        })
        .catch((error) => Alert.alert("Không thể tải thực đơn", error.message));
      return () => {
        active = false;
      };
    }, []),
  );
  const savePlans = async (changed: Plans) => {
    if (!loaded || saving) return;
    setSaving(true);
    try {
      await kitchenRequest("plans", "PUT", changed);
      setPlans((prev) => ({ ...prev, ...changed }));
    } catch (error) {
      Alert.alert(
        "Không thể lưu thực đơn",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      );
    } finally {
      setSaving(false);
    }
  };

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const currentPlan = plans[selectedDate] ?? emptyDay();

  const plannedMeals = MEALS.flatMap((meal) => currentPlan[meal.key]);
  const totalCalories =
    plannedMeals.length > 0 &&
    plannedMeals.every((meal) => meal.calories !== null)
      ? plannedMeals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0)
      : null;

  const mealCount = MEALS.filter(
    (meal) => currentPlan[meal.key].length > 0,
  ).length;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home" as any);
    }
  };

  const changeWeek = (direction: number) => {
    const nextWeek = addDays(weekStart, direction * 7);
    setWeekStart(nextWeek);
    setSelectedDate(dateKey(nextWeek));
  };

  const updateMeal = (type: MealType, recipes: Recipe[]) => {
    void savePlans({
      [selectedDate]: {
        ...(plans[selectedDate] ?? emptyDay()),
        [type]: recipes,
      },
    });
  };

  const changeMeal = (type: MealType, index?: number) => {
    if (!loaded || busy) return;
    if (index === undefined && currentPlan[type].length >= 6) {
      Alert.alert("Đủ món", "Mỗi buổi tối đa 6 món.");
      return;
    }
    const used = MEALS.flatMap((meal) => currentPlan[meal.key]).map(
      (recipe) => recipe.id,
    );
    const next = suggestMeal(recipeOptions, type, used, generation);
    if (!next) {
      Alert.alert(
        "Chưa có món khác",
        "Không có thêm món phù hợp để thêm hoặc đổi mà không trùng các bữa trong ngày.",
      );
      return;
    }
    const portioned = {
      ...next,
      servings: currentPlan[type][index ?? -1]?.servings ?? people,
    };
    updateMeal(
      type,
      index === undefined
        ? [...currentPlan[type], portioned]
        : currentPlan[type].map((recipe, i) =>
            i === index ? portioned : recipe,
          ),
    );
    setGeneration((prev) => prev + 1);
  };

  const generatePlan = async () => {
    if (!loaded || busy) return;
    setGenerating(true);
    try {
      const targetDates = dateRange(selectedDate, planDays);
      const nextPlans = await kitchenRequest<Plans>("plans/generate", "POST", {
        dates: targetDates,
        people,
      });
      const draft = Object.fromEntries(targetDates.map((day) => [day, nextPlans[day] ?? emptyDay()])) as Plans;
      if (targetDates.some((day) => !draft[day] || !MEALS.some((meal) => draft[day][meal.key]?.length))) {
        throw new Error("AI chưa tạo đủ thực đơn cho số ngày đã chọn. Vui lòng thử lại hoặc giảm số ngày.");
      }
      setPreviewDate(selectedDate);
      setPreviewPlan(draft);
      setLockedRecipeKeys([]);
      setPreviewMessage("");
      setAlternativeOptions([]);
      setAlternativeTarget(null);
      setPreviewVisible(true);
    } catch (error) {
      Alert.alert(
        "Không thể tạo thực đơn AI",
        error instanceof Error ? error.message : "Vui lòng thử lại",
      );
    } finally {
      setGenerating(false);
    }
  };

  const getDraftRecipe = (recipe: Recipe) =>
    recipeOptions.find((option) => option.id === recipe.id);

  const draftDates = previewPlan ? Object.keys(previewPlan).sort() : [];
  const draftRecipes = previewPlan
    ? draftDates.flatMap((day) => MEALS.flatMap((meal) => previewPlan[day][meal.key]))
    : [];
  const draftCalories = draftDates.length > 0 && draftRecipes.length > 0 && draftRecipes.every((item) => item.calories !== null)
    ? Math.round(draftRecipes.reduce((sum, item) => sum + (item.calories ?? 0), 0) / draftDates.length)
    : null;
  const draftIngredients = new Map<string, boolean>();
  for (const item of draftRecipes) {
    for (const ingredient of getDraftRecipe(item)?.ingredients ?? []) {
      const existing = draftIngredients.get(ingredient.id);
      draftIngredients.set(ingredient.id, existing === undefined ? ingredient.available : existing && ingredient.available);
    }
  }
  const availableIngredientCount = [...draftIngredients.values()].filter(Boolean).length;
  const missingIngredientCount = [...draftIngredients.values()].filter((available) => !available).length;

  const requestDraftPlans = async (dates: string[], excludeRecipeIds: string[]) => {
    const result = await kitchenRequest<Plans>("plans/generate", "POST", {
      dates,
      people,
      excludeRecipeIds,
    });
    return result;
  };

  const regenerateDraft = async () => {
    if (!previewDate || !previewPlan || previewBusy) return;
    const locked = new Set(lockedRecipeKeys);
    const excludedIds = [...new Set(lockedRecipeKeys.map((key) => key.slice(key.lastIndexOf(":") + 1)))].filter(Boolean);
    setPreviewBusy(true);
    setPreviewMessage("");
    try {
      const generated = await requestDraftPlans(draftDates, excludedIds);
      const next: Plans = {};
      for (const day of draftDates) {
        next[day] = emptyDay();
        for (const meal of MEALS) {
          const pinned = previewPlan[day][meal.key].filter((item) => locked.has(draftLockKey(day, meal.key, item.id)));
          const pinnedIds = new Set(pinned.map((item) => item.id));
          const remaining = (generated[day]?.[meal.key] ?? []).filter((item) => !pinnedIds.has(item.id));
          next[day][meal.key] = [...pinned, ...remaining].slice(0, 6);
        }
      }
      if (!draftDates.every((day) => MEALS.some((meal) => next[day][meal.key].length))) {
        throw new Error("AI chưa tạo được món mới. Hãy bỏ khóa một món rồi thử lại.");
      }
      setPreviewPlan(next);
    } catch (error) {
      setPreviewMessage(error instanceof Error ? error.message : "AI chưa thể tạo lại thực đơn.");
    } finally {
      setPreviewBusy(false);
    }
  };

  const suggestDraftDish = async (day: string, type: MealType, index?: number) => {
    if (!previewPlan || previewBusy) return;
    if (index === undefined && previewPlan[day][type].length >= 6) {
      setPreviewMessage("Mỗi bữa tối đa 6 món.");
      return;
    }
    const excluded = [...new Set(MEALS.flatMap((meal) => previewPlan[day][meal.key].map((item) => item.id)))];
    setPreviewBusy(true);
    setPreviewMessage("");
    try {
      const alternatives = await requestDraftPlans([day], excluded);
      const options = (alternatives[day]?.[type] ?? []).filter((item) => !excluded.includes(item.id));
      if (!options.length) {
        setPreviewMessage("Không có món phù hợp để thay thế trong bữa này.");
        return;
      }
      setAlternativeOptions(options);
      setAlternativeTarget({ date: day, type, index });
    } catch (error) {
      setPreviewMessage(error instanceof Error ? error.message : "AI chưa thể gợi ý món thay thế.");
    } finally {
      setPreviewBusy(false);
    }
  };

  const chooseAlternative = (recipe: Recipe) => {
    if (!alternativeTarget) return;
    const { date: day, type, index } = alternativeTarget;
    setPreviewPlan((current) => {
      if (!current) return current;
      const next = { ...current, [day]: { ...current[day], [type]: [...current[day][type]] } };
      if (index === undefined) next[day][type] = [...next[day][type], { ...recipe, servings: people }];
      else next[day][type][index] = { ...recipe, servings: people };
      return next;
    });
    if (index !== undefined) {
      const replacedId = previewPlan?.[day][type][index]?.id;
      if (replacedId) setLockedRecipeKeys((current) => current.filter((key) => key !== draftLockKey(day, type, replacedId)));
    }
    setAlternativeOptions([]);
    setAlternativeTarget(null);
  };

  const removeDraftDish = (day: string, type: MealType, recipe: Recipe) => {
    setPreviewPlan((current) => current ? {
      ...current,
      [day]: { ...current[day], [type]: current[day][type].filter((item) => item.id !== recipe.id) },
    } : current);
    setLockedRecipeKeys((current) => current.filter((key) => key !== draftLockKey(day, type, recipe.id)));
  };

  const toggleDraftLock = (day: string, type: MealType, recipe: Recipe) => {
    const key = draftLockKey(day, type, recipe.id);
    setLockedRecipeKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
  };

  const acceptDraft = async () => {
    if (!previewPlan || !previewDate || savingDraft) return;
    setSavingDraft(true);
    try {
      await kitchenRequest("plans", "PUT", previewPlan);
      setPlans((current) => ({ ...current, ...previewPlan }));
      setPreviewVisible(false);
      setPreviewPlan(null);
      setPreviewDate(null);
      Alert.alert("Đã lưu", "Lưu thực đơn thành công!");
    } catch (error) {
      Alert.alert("Không thể lưu thực đơn", error instanceof Error ? error.message : "Vui lòng thử lại.");
    } finally {
      setSavingDraft(false);
    }
  };

  const openRecipe = (recipe: Recipe) => {
    router.push({
      pathname: "/recipe-detail" as any,
      params: {
        name: recipe.name,
        id: recipe.id,
      },
    });
  };

  const openShoppingList = () => {
    router.push("/shopping-list" as any);
  };

  const renderMeal = (type: MealType) => {
    const config = MEALS.find((meal) => meal.key === type)!;

    const recipes = sortRecipesByName(
      currentPlan[type],
      (recipe) => recipe.name,
    );
    return (
      <View key={type} style={styles.mealCard}>
        <View style={styles.mealInfo}>
          <View style={styles.mealHeading}>
            <View style={[styles.mealLabelPill, { backgroundColor: config.background }]}>
              <Text style={styles.mealLabel}>{config.label}</Text>
            </View>
            <Text style={styles.mealTime}>{config.time} · {recipes[0]?.servings ?? people} phần</Text>
            <Pressable disabled={!loaded || busy} onPress={() => changeMeal(type)} style={styles.addMealButton}>
              <Plus size={14} color={C.orange} /><Text style={styles.addMealText}>Thêm món</Text>
            </Pressable>
          </View>
          <View style={styles.mealDivider} />

          {recipes.length ? recipes.map((recipe) => {
            const details = getDraftRecipe(recipe);
            const ingredientNames = details?.ingredients?.slice(0, 3) ?? [];
            return <View key={recipe.id} style={styles.savedRecipeBlock}>
              <Pressable style={styles.savedRecipeRow} onPress={() => openRecipe(recipe)} accessibilityRole="button" accessibilityLabel={`Xem chi tiết ${recipe.name}`}>
                <FoodImage uri={details?.image} resizeMode="cover" style={styles.savedRecipeImage} accessibilityLabel={`Ảnh món ${recipe.name}`} />
                <View style={styles.savedRecipeInfo}>
                  <Text style={styles.mealName}>{recipe.name}</Text>
                  <View style={styles.savedRecipeMeta}>
                    <Text style={styles.savedCalories}>{recipe.calories ?? "—"} kcal</Text>
                    <Text style={styles.savedMetaDot}>•</Text>
                    <Text style={styles.mealMetaText}>Khẩu phần: {recipe.servings ?? people} người</Text>
                  </View>
                  <View style={styles.savedIngredientChips}>
                    {ingredientNames.length ? ingredientNames.map((ingredient) => <Text key={ingredient.id} style={styles.savedIngredientChip} numberOfLines={1}>{ingredient.name}</Text>) : <Text style={styles.savedIngredientFallback}>Chưa có thông tin nguyên liệu</Text>}
                  </View>
                </View>
              </Pressable>
              <View style={styles.savedRecipeActions}>
                <Pressable onPress={() => openRecipe(recipe)} style={styles.savedRecipeAction}>
                  <Eye size={13} color={C.muted} /><Text style={styles.savedRecipeActionText}>Xem chi tiết</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => changeMeal(type, currentPlan[type].findIndex((item) => item.id === recipe.id))} style={styles.savedRecipeAction}>
                  <RefreshCw size={13} color={C.orange} /><Text style={[styles.savedRecipeActionText, { color: C.orange }]}>Đổi món</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => updateMeal(type, currentPlan[type].filter((item) => item.id !== recipe.id))} style={styles.savedRecipeAction}>
                  <Trash2 size={13} color="#C84242" /><Text style={[styles.savedRecipeActionText, { color: "#C84242" }]}>Xóa món</Text>
                </Pressable>
              </View>
            </View>;
          }) : <Text style={styles.emptyMealText}>Chưa chọn món cho bữa ăn này</Text>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      {/* HEADER CHUNG */}
      <AppHeader />

      {/* NÚT QUAY LẠI + TIÊU ĐỀ */}
      <View style={styles.pageHeader}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={21} color={C.orange} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Lập thực đơn</Text>
          <Text style={styles.headerSubtitle}>
            Ăn ngon, đủ chất, ít lãng phí
          </Text>
        </View>

        <CalendarDays size={21} color={C.orange} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>THỰC ĐƠN TUẦN NÀY</Text>

        {/* CHUYỂN TUẦN */}
        <View style={styles.weekHeader}>
          <Text style={styles.weekTitle}>
            {days[0].getDate()}/{days[0].getMonth() + 1}
            {" – "}
            {days[6].getDate()}/{days[6].getMonth() + 1}/{days[6].getFullYear()}
          </Text>

          <View style={styles.weekControls}>
            <Pressable onPress={() => changeWeek(-1)}>
              <ChevronLeft size={21} color={C.orange} />
            </Pressable>

            <Text style={styles.weekControlText}>Tuần</Text>

            <Pressable onPress={() => changeWeek(1)}>
              <ChevronRight size={21} color={C.orange} />
            </Pressable>
          </View>
        </View>

        {/* AI GỢI Ý */}
        <View style={styles.aiCard}>
          <View style={styles.aiIcon}>
            <Sparkles size={22} color={C.white} />
          </View>

          <View style={styles.aiInfo}>
            <Text style={styles.aiTitle}>Lập thực đơn với Gemini AI</Text>
            <View style={styles.peopleRow}>
              <Text style={styles.peopleLabel}>Số người ăn</Text>
              <View style={styles.peopleControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Giảm số người"
                  disabled={busy || people <= 1}
                  onPress={() => setPeople((value) => Math.max(1, value - 1))}
                  style={[
                    styles.peopleButton,
                    (busy || people <= 1) && { opacity: 0.4 },
                  ]}
                >
                  <Minus size={18} color={C.orange} />
                </Pressable>
                <Text
                  accessibilityLiveRegion="polite"
                  style={styles.peopleValue}
                >
                  {people} người
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tăng số người"
                  disabled={busy || people >= 20}
                  onPress={() => setPeople((value) => Math.min(20, value + 1))}
                  style={[
                    styles.peopleButton,
                    (busy || people >= 20) && { opacity: 0.4 },
                  ]}
                >
                  <Plus size={18} color={C.orange} />
                </Pressable>
              </View>
            </View>

            <View style={styles.daysCountRow}>
              <Text style={styles.peopleLabel}>Số ngày muốn lập</Text>
              <View style={styles.peopleControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Giảm số ngày"
                  disabled={busy || planDays <= 1}
                  onPress={() => setPlanDays((value) => Math.max(1, value - 1))}
                  style={[styles.peopleButton, (busy || planDays <= 1) && { opacity: 0.4 }]}
                >
                  <Minus size={18} color={C.orange} />
                </Pressable>
                <Text accessibilityLiveRegion="polite" style={styles.peopleValue}>{planDays} ngày</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tăng số ngày"
                  disabled={busy || planDays >= 7}
                  onPress={() => setPlanDays((value) => Math.min(7, value + 1))}
                  style={[styles.peopleButton, (busy || planDays >= 7) && { opacity: 0.4 }]}
                >
                  <Plus size={18} color={C.orange} />
                </Pressable>
              </View>
            </View>

            <Pressable
              disabled={!loaded || busy}
              style={[
                styles.generateButton,
                (!loaded || busy) && { opacity: 0.5 },
              ]}
              onPress={generatePlan}
            >
              <Sparkles size={16} color={C.white} />
              <Text style={styles.generateText}>
                {generating
                  ? "AI đang lập thực đơn…"
                  : "Tạo thực đơn AI"}
              </Text>
              {generating && <ActivityIndicator size="small" color={C.white} />}
            </Pressable>
          </View>
        </View>

        {/* CHỌN NGÀY */}
        <Text style={styles.sectionTitle}>Chọn ngày</Text>

        <View style={styles.dayRow}>
          {days.map((date) => {
            const key = dateKey(date);
            const active = selectedDate === key;

            return (
              <Pressable
                key={key}
                style={[styles.dayButton, active && styles.dayButtonActive]}
                onPress={() => setSelectedDate(key)}
              >
                <Text style={[styles.dayLabel, active && styles.activeDayText]}>
                  {WEEKDAYS[date.getDay()]}
                </Text>

                <Text
                  style={[styles.dayNumber, active && styles.activeDayText]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* THỰC ĐƠN THEO NGÀY */}
        <View style={styles.savedMenuTitleRow}>
          <View style={styles.savedMenuTitle}>
            <Utensils size={15} color={C.orange} />
            <Text style={styles.savedMenuTitleText}>Thực đơn 3 bữa chính{selectedDate === dateKey(new Date()) ? " hôm nay" : ""}</Text>
          </View>
          <Text style={styles.savedMenuSync}>{loaded ? "Đã đồng bộ CSDL" : "Đang tải…"}</Text>
        </View>
        <View style={styles.selectedDayHeader}>
          <Text style={styles.selectedDayTitle}>
            {formatDate(new Date(`${selectedDate}T12:00:00`))}
          </Text>

          <Text style={styles.mealCount}>{mealCount}/3 bữa ăn</Text>
        </View>

        {MEALS.map((meal) => renderMeal(meal.key))}

        {/* DINH DƯỠNG */}
        <View style={styles.nutritionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nutritionTitle}>Tổng dinh dưỡng hôm nay</Text>

            <Text style={styles.nutritionSubtitle}>
              Ước tính cho 1 người từ các món đã lên kế hoạch
            </Text>
          </View>

          <Text style={styles.totalCalories}>
            {totalCalories ?? "—"}
            <Text style={styles.calorieUnit}> kcal</Text>
          </Text>
        </View>

        {/* MẸO */}
        <View style={styles.tipCard}>
          <ChefHat size={20} color={C.green} />

          <Text style={styles.tipText}>
            Mẹo Smart Kitchen AI: Ưu tiên các món sử dụng nguyên liệu gần hết
            hạn để giảm lãng phí.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={previewVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingDraft) setPreviewVisible(false);
        }}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewSheet}>
            <View style={styles.previewHeader}>
              <View style={styles.previewTitleWrap}>
                <View style={styles.previewSparkle}><Sparkles size={18} color={C.white} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle}>Thực đơn AI đề xuất</Text>
                  <Text style={styles.previewSubtitle}>Bản nháp · chưa được lưu</Text>
                </View>
              </View>
              <Pressable accessibilityLabel="Đóng bản nháp" disabled={savingDraft} onPress={() => setPreviewVisible(false)} style={styles.previewClose}>
                <X size={19} color={C.muted} />
              </Pressable>
            </View>

            <View style={styles.previewSetup}>
              <CalendarDays size={15} color={C.orange} />
              <Text style={styles.previewSetupText}>{draftDates.length > 1 ? `${formatDate(new Date(`${draftDates[0]}T12:00:00`))} – ${formatDate(new Date(`${draftDates[draftDates.length - 1]}T12:00:00`))}` : previewDate ? formatDate(new Date(`${previewDate}T12:00:00`)) : "Ngày đã chọn"}</Text>
              <View style={styles.previewSetupDivider} />
              <Text style={styles.previewSetupText}>{draftDates.length} ngày · {people} người ăn</Text>
              <View style={styles.pantryPriority}><Check size={12} color={C.green} /><Text style={styles.pantryPriorityText}>Ưu tiên nguyên liệu trong kho</Text></View>
            </View>

            <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewContent} showsVerticalScrollIndicator={false}>
              {draftDates.map((day, dayIndex) => (
                <View key={day} style={styles.previewDaySection}>
                  <View style={styles.previewDayHeading}>
                    <Text style={styles.previewDayTitle}>{formatDate(new Date(`${day}T12:00:00`))}</Text>
                    <Text style={styles.previewDayIndex}>Ngày {dayIndex + 1}/{draftDates.length}</Text>
                  </View>
                  {MEALS.map((meal) => {
                    const Icon = meal.icon;
                    const dayMeals = previewPlan?.[day]?.[meal.key] ?? [];
                    return (
                      <View key={`${day}-${meal.key}`} style={styles.previewMealSection}>
                        <View style={styles.previewMealHeading}>
                          <View style={[styles.previewMealIcon, { backgroundColor: meal.background }]}><Icon size={17} color={C.orange} /></View>
                          <Text style={styles.previewMealTitle}>{meal.label}</Text>
                          <Text style={styles.previewMealTime}>{meal.time}</Text>
                        </View>
                        {dayMeals.map((recipe, index) => {
                          const details = getDraftRecipe(recipe);
                          const locked = lockedRecipeKeys.includes(draftLockKey(day, meal.key, recipe.id));
                          const ingredients = details?.ingredients ?? [];
                          const inPantry = ingredients.filter((item) => item.available);
                          const toBuy = ingredients.filter((item) => !item.available);
                          const ingredientNames = (items: typeof ingredients) => items.length
                            ? items.map((item) => `${item.name}${item.amount != null ? ` · ${item.amount}${item.unit ? ` ${item.unit}` : ""}` : ""}`).join(", ")
                            : "Không có";
                          return (
                            <View key={`${day}-${meal.key}-${recipe.id}`} style={styles.draftDishCard}>
                              <FoodImage uri={details?.image} resizeMode="cover" style={styles.draftDishImage} accessibilityLabel={`Ảnh món ${recipe.name}`} />
                              <View style={styles.draftDishInfo}>
                                <Text style={styles.draftDishName}>{recipe.name}</Text>
                                <Text style={styles.draftDishMeta}>{recipe.servings ?? people} khẩu phần · {recipe.minutes} phút · {recipe.calories ?? "—"} kcal/khẩu phần</Text>
                                <View style={styles.draftIngredientColumns}>
                                  <View style={[styles.draftIngredientGroup, styles.draftPantryGroup]}>
                                    <Text style={[styles.draftIngredientLabel, { color: C.green }]}>Có trong kho · {inPantry.length}</Text>
                                    <Text style={styles.draftIngredientText}>{ingredientNames(inPantry)}</Text>
                                  </View>
                                  <View style={[styles.draftIngredientGroup, styles.draftBuyGroup]}>
                                    <Text style={styles.draftIngredientLabel}>Cần mua · {toBuy.length}</Text>
                                    <Text style={styles.draftIngredientText}>{ingredientNames(toBuy)}</Text>
                                  </View>
                                </View>
                                <View style={styles.draftDishActions}>
                                  <Pressable disabled={previewBusy || savingDraft} onPress={() => void suggestDraftDish(day, meal.key, index)} style={styles.draftActionButton}>
                                    <RefreshCw size={13} color={C.orange} /><Text style={styles.draftActionText}>Đổi món</Text>
                                  </Pressable>
                                  <Pressable disabled={previewBusy || savingDraft} onPress={() => toggleDraftLock(day, meal.key, recipe)} style={[styles.draftActionButton, locked && styles.draftLockedButton]}>
                                    {locked ? <Lock size={13} color={C.green} /> : <LockOpen size={13} color={C.muted} />}
                                    <Text style={[styles.draftActionText, locked && { color: C.green }]}>{locked ? "Đã khóa" : "Khóa món"}</Text>
                                  </Pressable>
                                  <Pressable disabled={previewBusy || savingDraft} accessibilityLabel={`Xóa ${recipe.name}`} onPress={() => removeDraftDish(day, meal.key, recipe)} style={styles.draftDeleteButton}>
                                    <Trash2 size={14} color={C.muted} />
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                        {!dayMeals.length && <Text style={styles.previewEmptyMeal}>Chưa có món trong bữa này. Bạn có thể thêm món.</Text>}
                        <Pressable disabled={previewBusy || savingDraft} onPress={() => void suggestDraftDish(day, meal.key)} style={styles.draftAddButton}>
                          <Plus size={15} color={C.orange} /><Text style={styles.draftAddText}>Thêm món</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}

              <View style={styles.draftSummaryCard}>
                <Text style={styles.draftSummaryTitle}>Tổng quan thực đơn</Text>
                <View style={styles.draftSummaryGrid}>
                  <View style={styles.draftSummaryItem}><Text style={styles.draftSummaryValue}>{draftRecipes.length}</Text><Text style={styles.draftSummaryLabel}>Tổng số món</Text></View>
                  <View style={styles.draftSummaryItem}><Text style={styles.draftSummaryValue}>{draftCalories ?? "—"}</Text><Text style={styles.draftSummaryLabel}>kcal/người/ngày (trung bình)</Text></View>
                  <View style={styles.draftSummaryItem}><Text style={styles.draftSummaryValue}>{people} người</Text><Text style={styles.draftSummaryLabel}>Khẩu phần dự kiến</Text></View>
                  <View style={styles.draftSummaryItem}><Text style={styles.draftSummaryValue}>{availableIngredientCount} có · {missingIngredientCount} thiếu</Text><Text style={styles.draftSummaryLabel}>Nguyên liệu trong kho</Text></View>
                </View>
              </View>
              {!!previewMessage && <View style={styles.previewError}><Text style={styles.previewErrorText}>{previewMessage}</Text></View>}
              <Pressable disabled={previewBusy || savingDraft} onPress={() => void regenerateDraft()} style={[styles.regenerateButton, (previewBusy || savingDraft) && { opacity: 0.65 }]}>
                {previewBusy ? <ActivityIndicator size="small" color={C.orange} /> : <RefreshCw size={15} color={C.orange} />}
                <Text style={styles.regenerateText}>{previewBusy ? "AI đang cập nhật…" : "Tạo lại thực đơn"}</Text>
              </Pressable>
              <Text style={styles.previewFootnote}>Các thay đổi trong bản xem trước chưa được lưu vào thực đơn chính thức.</Text>
            </ScrollView>

            <View style={[styles.previewFooter, { paddingBottom: Math.max(13, insets.bottom + 8) }]}>
              <Pressable disabled={savingDraft} onPress={() => setPreviewVisible(false)} style={styles.cancelDraftButton}><Text style={styles.cancelDraftText}>Hủy</Text></Pressable>
              <Pressable disabled={savingDraft || previewBusy || !draftRecipes.length} onPress={() => void acceptDraft()} style={[styles.acceptDraftButton, (savingDraft || previewBusy || !draftRecipes.length) && { opacity: 0.6 }]}>
                {savingDraft ? <ActivityIndicator size="small" color={C.white} /> : <Check size={16} color={C.white} />}
                <Text style={styles.acceptDraftText}>{savingDraft ? "Đang lưu…" : "Chấp nhận và lưu thực đơn"}</Text>
              </Pressable>
            </View>

            {alternativeTarget && <View style={styles.alternativeOverlay}>
              <View style={styles.alternativeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle}>Chọn món thay thế</Text>
                  <Text style={styles.previewSubtitle}>Gemini đề xuất · {formatDate(new Date(`${alternativeTarget.date}T12:00:00`))} · {MEALS.find((meal) => meal.key === alternativeTarget.type)?.label.toLowerCase()}</Text>
                </View>
                <Pressable accessibilityLabel="Đóng danh sách món thay thế" onPress={() => { setAlternativeTarget(null); setAlternativeOptions([]); }} style={styles.previewClose}><X size={19} color={C.muted} /></Pressable>
              </View>
              <ScrollView style={styles.alternativeScroll} contentContainerStyle={styles.alternativeList} showsVerticalScrollIndicator={false}>
                {alternativeOptions.map((recipe) => {
                  const details = getDraftRecipe(recipe);
                  return <Pressable key={recipe.id} onPress={() => chooseAlternative(recipe)} style={styles.alternativeCard}>
                    <FoodImage uri={details?.image} resizeMode="cover" style={styles.alternativeImage} accessibilityLabel={`Ảnh món ${recipe.name}`} />
                    <View style={styles.alternativeInfo}>
                      <Text style={styles.draftDishName}>{recipe.name}</Text>
                      <Text style={styles.draftDishMeta}>{recipe.minutes} phút · {recipe.calories ?? "—"} kcal/khẩu phần</Text>
                      <Text style={styles.draftIngredientText} numberOfLines={2}>{details?.ingredients?.slice(0, 3).map((item) => item.name).join(", ") || "Nguyên liệu theo công thức"}</Text>
                    </View>
                    <Check size={17} color={C.green} />
                  </Pressable>;
                })}
                {!alternativeOptions.length && <Text style={styles.previewEmptyMeal}>Không có món phù hợp để thay thế.</Text>}
              </ScrollView>
            </View>}
          </View>
        </View>
      </Modal>

      {/* NÚT DANH SÁCH MUA SẮM */}
      <View style={styles.bottomAction}>
        <Pressable style={styles.shoppingButton} onPress={openShoppingList}>
          <ShoppingCart size={19} color={C.white} />

          <Text style={styles.shoppingText}>Xem nguyên liệu cần mua</Text>

          <ChevronRight size={18} color={C.white} />
        </Pressable>
      </View>

      {/* BOTTOM NAV CHUNG */}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  previewOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(28, 18, 13, 0.48)" },
  previewSheet: { position: "relative", width: "100%", maxHeight: "94%", backgroundColor: C.cream, borderTopLeftRadius: 23, borderTopRightRadius: 23, overflow: "hidden" },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 17, paddingTop: 17, paddingBottom: 13, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  previewTitleWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  previewSparkle: { width: 37, height: 37, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: C.orange },
  previewTitle: { color: C.dark, fontSize: 16, fontWeight: "800" },
  previewSubtitle: { color: C.muted, fontSize: 10, marginTop: 3 },
  previewClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: C.cream },
  previewSetup: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  previewSetupText: { color: C.dark, fontSize: 11, fontWeight: "700" },
  previewSetupDivider: { width: 1, height: 16, marginHorizontal: 2, backgroundColor: C.border },
  pantryPriority: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto", borderRadius: 20, backgroundColor: C.greenLight, paddingHorizontal: 8, paddingVertical: 5 },
  pantryPriorityText: { color: C.green, fontSize: 9, fontWeight: "700" },
  previewScroll: { flexGrow: 0, flexShrink: 1 },
  previewContent: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 14 },
  previewDaySection: { marginBottom: 14, padding: 10, borderWidth: 1, borderColor: C.border, borderRadius: 14, backgroundColor: "#FFFCFA" },
  previewDayHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 11, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  previewDayTitle: { color: C.dark, fontSize: 13, fontWeight: "800" },
  previewDayIndex: { color: C.orange, fontSize: 10, fontWeight: "700" },
  previewMealSection: { marginBottom: 13 },
  previewMealHeading: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  previewMealIcon: { width: 29, height: 29, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  previewMealTitle: { flex: 1, color: C.dark, fontSize: 14, fontWeight: "800" },
  previewMealTime: { color: C.muted, fontSize: 10 },
  draftDishCard: { flexDirection: "row", gap: 10, marginBottom: 8, padding: 9, borderWidth: 1, borderColor: C.border, borderRadius: 13, backgroundColor: C.white },
  draftDishImage: { width: 78, height: 78, borderRadius: 10, backgroundColor: C.peach },
  draftDishInfo: { flex: 1, minWidth: 0 },
  draftDishName: { color: C.dark, fontSize: 12, fontWeight: "800" },
  draftDishMeta: { color: C.muted, fontSize: 9, marginTop: 4 },
  draftIngredientLabel: { color: C.orange, fontSize: 9, fontWeight: "700", marginTop: 6 },
  draftIngredientText: { color: C.muted, fontSize: 9, marginTop: 2 },
  draftIngredientColumns: { flexDirection: "row", gap: 5, marginTop: 5 },
  draftIngredientGroup: { flex: 1, minWidth: 0, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 7 },
  draftPantryGroup: { backgroundColor: C.greenLight },
  draftBuyGroup: { backgroundColor: C.peach },
  draftDishActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 8 },
  draftActionButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3 },
  draftLockedButton: { borderRadius: 5, backgroundColor: C.greenLight, paddingHorizontal: 5 },
  draftActionText: { color: C.orange, fontSize: 9, fontWeight: "700" },
  draftDeleteButton: { width: 26, height: 25, alignItems: "center", justifyContent: "center", marginLeft: "auto", borderRadius: 7, backgroundColor: C.cream },
  previewEmptyMeal: { color: C.muted, fontSize: 10, paddingVertical: 9 },
  draftAddButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 34, borderWidth: 1, borderStyle: "dashed", borderColor: C.orange, borderRadius: 9, backgroundColor: C.white },
  draftAddText: { color: C.orange, fontSize: 10, fontWeight: "800" },
  draftSummaryCard: { padding: 12, borderWidth: 1, borderColor: C.border, borderRadius: 13, backgroundColor: C.white },
  draftSummaryTitle: { color: C.dark, fontSize: 12, fontWeight: "800", marginBottom: 10 },
  draftSummaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  draftSummaryItem: { width: "48%", minHeight: 57, justifyContent: "center", padding: 8, borderRadius: 9, backgroundColor: C.cream },
  draftSummaryValue: { color: C.green, fontSize: 12, fontWeight: "800" },
  draftSummaryLabel: { color: C.muted, fontSize: 9, marginTop: 3 },
  previewError: { marginTop: 10, padding: 10, borderRadius: 9, backgroundColor: "#FFF0ED" },
  previewErrorText: { color: "#842D00", fontSize: 10, lineHeight: 15 },
  regenerateButton: { minHeight: 39, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 12, borderWidth: 1, borderColor: C.orange, borderRadius: 10, backgroundColor: C.white },
  regenerateText: { color: C.orange, fontSize: 11, fontWeight: "800" },
  previewFootnote: { color: C.muted, fontSize: 9, textAlign: "center", lineHeight: 14, marginTop: 9 },
  previewFooter: { flexDirection: "row", gap: 9, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 13, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white },
  cancelDraftButton: { minWidth: 72, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 15, minHeight: 45, backgroundColor: C.white },
  cancelDraftText: { color: C.muted, fontSize: 11, fontWeight: "800" },
  acceptDraftButton: { flex: 1, minHeight: 45, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.orange },
  acceptDraftText: { color: C.white, fontSize: 11, fontWeight: "800" },
  alternativeOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 2, elevation: 4, padding: 14, backgroundColor: C.cream },
  alternativeHeader: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: C.border },
  alternativeScroll: { flex: 1 },
  alternativeList: { paddingTop: 12, paddingBottom: 20, gap: 9 },
  alternativeCard: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 10, padding: 9, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.white },
  alternativeImage: { width: 62, height: 62, borderRadius: 9, backgroundColor: C.peach },
  alternativeInfo: { flex: 1, gap: 4 },
  peopleRow: { marginTop: 9, marginBottom: 13, gap: 7 },
  daysCountRow: { marginBottom: 12, gap: 7 },
  peopleLabel: { fontSize: 14, fontWeight: "600", color: C.dark },
  peopleControls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  peopleButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  peopleValue: {
    minWidth: 70,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: C.dark,
  },
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },
  pageHeader: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
  },
  headerSubtitle: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  eyebrow: {
    color: C.orange,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
    marginBottom: 18,
  },
  weekTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: C.dark,
  },
  weekControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.peach,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  weekControlText: {
    color: C.orange,
    fontSize: 11,
    fontWeight: "800",
  },
  aiCard: {
    backgroundColor: C.peach,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 13,
    flexDirection: "row",
    gap: 10,
    marginBottom: 21,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  aiInfo: {
    flex: 1,
    minWidth: 0,
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
  },
  aiDescription: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 17,
    marginTop: 6,
  },
  generateButton: {
    backgroundColor: C.orange,
    borderRadius: 10,
    marginTop: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  generateText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 22,
  },
  dayButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  dayButtonActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: C.dark,
    marginTop: 7,
  },
  activeDayText: {
    color: C.white,
  },
  selectedDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedDayTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
  },
  mealCount: {
    fontSize: 11,
    fontWeight: "800",
    color: C.orange,
  },
  mealCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 13,
    marginBottom: 13,
  },
  mealInfo: {
    minWidth: 0,
  },
  mealHeading: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  mealLabelPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
  },
  mealLabel: {
    fontSize: 10,
    color: C.orange,
    fontWeight: "800",
  },
  mealTime: {
    fontSize: 10,
    color: C.muted,
    flex: 1,
    minWidth: 86,
  },
  addMealButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 3,
  },
  addMealText: {
    color: C.orange,
    fontSize: 10,
    fontWeight: "800",
  },
  mealDivider: {
    height: 1,
    backgroundColor: C.border,
    marginTop: 10,
    marginBottom: 9,
  },
  savedRecipeBlock: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  savedRecipeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  savedRecipeImage: {
    width: 72,
    height: 72,
    borderRadius: 11,
    backgroundColor: C.peach,
  },
  savedRecipeInfo: {
    flex: 1,
    minWidth: 0,
  },
  savedRecipeMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 5,
  },
  savedCalories: {
    color: C.orange,
    fontSize: 10,
    fontWeight: "800",
  },
  mealMetaText: {
    color: C.muted,
    fontSize: 9,
  },
  savedMetaDot: {
    color: C.muted,
    fontSize: 10,
  },
  savedIngredientChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 7,
  },
  savedIngredientChip: {
    maxWidth: "48%",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    backgroundColor: "#FFFAF8",
    color: C.muted,
    fontSize: 8,
  },
  savedIngredientFallback: {
    color: C.muted,
    fontSize: 9,
    fontStyle: "italic",
  },
  mealName: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
    lineHeight: 17,
  },
  emptyMealText: {
    fontSize: 11,
    color: C.muted,
    marginTop: 9,
  },
  savedRecipeActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#F5ECE7",
  },
  savedRecipeAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 27,
  },
  savedRecipeActionText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
  savedMenuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 7,
  },
  savedMenuTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  savedMenuTitleText: {
    color: C.dark,
    fontSize: 12,
    fontWeight: "800",
  },
  savedMenuSync: {
    color: C.green,
    fontSize: 9,
    fontWeight: "600",
  },
  nutritionCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 13,
    marginTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 7,
  },
  nutritionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
  },
  nutritionSubtitle: {
    fontSize: 9,
    color: C.muted,
    marginTop: 5,
  },
  totalCalories: {
    fontSize: 17,
    fontWeight: "800",
    color: C.green,
  },
  calorieUnit: {
    fontSize: 10,
  },
  tipCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: C.greenLight,
    padding: 14,
    borderRadius: 13,
    marginTop: 15,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    color: C.green,
    lineHeight: 17,
  },
  bottomAction: {
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  shoppingButton: {
    backgroundColor: C.orange,
    borderRadius: 12,
    height: 44,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  shoppingText: {
    fontSize: 12,
    color: C.white,
    fontWeight: "800",
  },
});

// Người dùng khách cần đăng nhập trước khi truy cập chức năng cá nhân.
export default function ProtectedPage() {
  return (
    <RequireLogin>
      <MealPlanScreen />
    </RequireLogin>
  );
}
