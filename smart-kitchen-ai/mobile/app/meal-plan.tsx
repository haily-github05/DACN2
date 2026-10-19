import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChefHat,
  Clock3,
  Flame,
  RefreshCw,
  Plus,
  ShoppingCart,
  Sun,
  Sunset,
  Moon,
  CalendarDays,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

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
  calories: number;
};

type DayPlan = Record<MealType, Recipe | null>;
type Plans = Record<string, DayPlan>;

const RECIPES: Record<MealType, Recipe[]> = {
  breakfast: [
    {
      id: "b1",
      name: "Trứng cuộn rau củ",
      minutes: 10,
      calories: 240,
    },
    {
      id: "b2",
      name: "Bánh mì trứng phô mai",
      minutes: 12,
      calories: 320,
    },
    {
      id: "b3",
      name: "Sữa chua trái cây",
      minutes: 5,
      calories: 180,
    },
    {
      id: "b4",
      name: "Cháo yến mạch",
      minutes: 15,
      calories: 250,
    },
  ],
  lunch: [
    {
      id: "l1",
      name: "Ức gà áp chảo sốt tiêu đen",
      minutes: 25,
      calories: 420,
    },
    {
      id: "l2",
      name: "Cơm bò xào rau củ",
      minutes: 25,
      calories: 480,
    },
    {
      id: "l3",
      name: "Cá hồi áp chảo",
      minutes: 20,
      calories: 410,
    },
    {
      id: "l4",
      name: "Cơm gà nấm",
      minutes: 30,
      calories: 450,
    },
  ],
  dinner: [
    {
      id: "d1",
      name: "Canh thịt bò rong biển",
      minutes: 20,
      calories: 310,
    },
    {
      id: "d2",
      name: "Salad cá hồi sốt mè rang",
      minutes: 15,
      calories: 310,
    },
    {
      id: "d3",
      name: "Súp bí đỏ hạt sen",
      minutes: 20,
      calories: 245,
    },
    {
      id: "d4",
      name: "Bò cuộn súp lơ baby",
      minutes: 25,
      calories: 380,
    },
  ],
};

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

function formatDate(date: Date) {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function emptyDay(): DayPlan {
  return {
    breakfast: null,
    lunch: null,
    dinner: null,
  };
}

export default function MealPlanScreen() {
  const router = useRouter();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));

  const [plans, setPlans] = useState<Plans>({});
  const [generation, setGeneration] = useState(0);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const currentPlan = plans[selectedDate] ?? emptyDay();

  const totalCalories = MEALS.reduce(
    (sum, meal) => sum + (currentPlan[meal.key]?.calories ?? 0),
    0,
  );

  const mealCount = MEALS.filter(
    (meal) => currentPlan[meal.key] !== null,
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

  const updateMeal = (type: MealType, recipe: Recipe | null) => {
    setPlans((previous) => ({
      ...previous,
      [selectedDate]: {
        ...(previous[selectedDate] ?? emptyDay()),
        [type]: recipe,
      },
    }));
  };

  const changeMeal = (type: MealType) => {
    const options = RECIPES[type];
    const currentId = currentPlan[type]?.id;

    const currentIndex = options.findIndex((recipe) => recipe.id === currentId);

    const next = options[(currentIndex + 1) % options.length];

    updateMeal(type, next);
  };

  const generatePlan = () => {
    const nextPlans: Plans = { ...plans };

    days.forEach((date, dayIndex) => {
      const plan: DayPlan = emptyDay();

      MEALS.forEach(({ key }) => {
        const options = RECIPES[key];

        plan[key] = options[(dayIndex + generation) % options.length];
      });

      nextPlans[dateKey(date)] = plan;
    });

    setPlans(nextPlans);
    setGeneration((prev) => prev + 1);

    Alert.alert(
      "Đã tạo thực đơn",
      "Đã tạo thực đơn mẫu cho 7 ngày. Bạn có thể đổi từng món theo sở thích.",
    );
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

    const recipe = currentPlan[type];
    const Icon = config.icon;

    return (
      <View key={type} style={styles.mealCard}>
        <View style={[styles.mealIcon, { backgroundColor: config.background }]}>
          <Icon size={23} color={C.orange} />
        </View>

        <View style={styles.mealInfo}>
          <View style={styles.mealHeading}>
            <Text style={styles.mealLabel}>{config.label}</Text>
            <Text style={styles.mealTime}>{config.time}</Text>
          </View>

          {recipe ? (
            <>
              <Pressable onPress={() => openRecipe(recipe)}>
                <Text style={styles.mealName} numberOfLines={2}>
                  {recipe.name}
                </Text>
              </Pressable>

              <View style={styles.mealMeta}>
                <Clock3 size={12} color={C.muted} />
                <Text style={styles.mealMetaText}>{recipe.minutes} phút</Text>

                <Flame size={12} color={C.orange} />
                <Text style={styles.mealMetaText}>{recipe.calories} kcal</Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyMealText}>
              Chưa chọn món cho bữa ăn này
            </Text>
          )}

          <View style={styles.mealActions}>
            <Pressable
              onPress={() => changeMeal(type)}
              style={styles.mealActionButton}
            >
              {recipe ? (
                <RefreshCw size={13} color={C.orange} />
              ) : (
                <Plus size={13} color={C.orange} />
              )}

              <Text style={styles.mealActionText}>
                {recipe ? "Đổi món" : "Thêm món"}
              </Text>
            </Pressable>

            {recipe && (
              <Pressable
                onPress={() => openRecipe(recipe)}
                style={styles.detailAction}
              >
                <Text style={styles.detailActionText}>Xem công thức</Text>
                <ChevronRight size={13} color={C.green} />
              </Pressable>
            )}
          </View>
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
            <Text style={styles.aiTitle}>Chef AI lên thực đơn cho bạn</Text>

            <Text style={styles.aiDescription}>
              Gợi ý các món ăn cho 7 ngày, giúp bạn dễ dàng lên kế hoạch nấu
              nướng.
            </Text>

            <Pressable style={styles.generateButton} onPress={generatePlan}>
              <Sparkles size={16} color={C.white} />
              <Text style={styles.generateText}>Tạo thực đơn gợi ý</Text>
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
              Ước tính từ các món đã lên kế hoạch
            </Text>
          </View>

          <Text style={styles.totalCalories}>
            {totalCalories}
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
  },
  aiTitle: {
    fontSize: 13,
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
    flexDirection: "row",
    gap: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 11,
  },
  mealIcon: {
    width: 49,
    height: 49,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mealInfo: {
    flex: 1,
  },
  mealHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealLabel: {
    fontSize: 11,
    color: C.orange,
    fontWeight: "800",
  },
  mealTime: {
    fontSize: 10,
    color: C.muted,
  },
  mealName: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
    marginTop: 7,
  },
  emptyMealText: {
    fontSize: 11,
    color: C.muted,
    marginTop: 9,
  },
  mealMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  mealMetaText: {
    fontSize: 10,
    color: C.muted,
  },
  mealActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 14,
    marginTop: 12,
  },
  mealActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mealActionText: {
    fontSize: 10,
    color: C.orange,
    fontWeight: "800",
  },
  detailAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  detailActionText: {
    fontSize: 10,
    color: C.green,
    fontWeight: "700",
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
