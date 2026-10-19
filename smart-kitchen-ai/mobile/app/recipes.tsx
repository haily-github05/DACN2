import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Image,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  X,
  SlidersHorizontal,
  Sparkles,
  Clock3,
  Flame,
  Heart,
  ChefHat,
  ShoppingCart,
  CheckCircle2,
  RefreshCw,
  Leaf,
  UtensilsCrossed,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

const C = {
  orange: "#A23A00",
  deepOrange: "#842D00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  green: "#397C57",
  mint: "#E9F5EB",
};

type Recipe = {
  id: string;
  name: string;
  description: string;
  image: string;
  minutes: number;
  calories: number;
  match: number;
  category: string;
  ingredients: string[];
};

type FilterType = "all" | "full" | "quick" | "missing";

const RECIPES: Recipe[] = [
  {
    id: "1",
    name: "Ức gà áp chảo sốt tiêu đen",
    description: "Thơm ngon, giàu protein, dễ chế biến.",
    image:
      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop",
    minutes: 25,
    calories: 420,
    match: 100,
    category: "Món chính",
    ingredients: ["Ức gà", "Tỏi", "Tiêu đen", "Dầu ô liu"],
  },
  {
    id: "2",
    name: "Trứng cuộn rau củ",
    description: "Bữa sáng nhanh gọn và bổ dưỡng.",
    image:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop",
    minutes: 10,
    calories: 240,
    match: 100,
    category: "Bữa sáng",
    ingredients: ["Trứng gà", "Cà rốt", "Hành lá"],
  },
  {
    id: "3",
    name: "Salad rau củ",
    description: "Thanh mát, nhiều chất xơ và vitamin.",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop",
    minutes: 12,
    calories: 210,
    match: 80,
    category: "Ăn lành mạnh",
    ingredients: ["Xà lách", "Cà chua", "Dưa leo"],
  },
  {
    id: "4",
    name: "Cơm chiên trứng",
    description: "Tận dụng cơm nguội, tiết kiệm thực phẩm.",
    image:
      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop",
    minutes: 15,
    calories: 390,
    match: 90,
    category: "Món chính",
    ingredients: ["Cơm", "Trứng gà", "Hành lá"],
  },
  {
    id: "5",
    name: "Mì Ý sốt cà chua",
    description: "Món Ý dễ nấu với nguyên liệu quen thuộc.",
    image:
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&auto=format&fit=crop",
    minutes: 30,
    calories: 480,
    match: 60,
    category: "Món chính",
    ingredients: ["Mì Ý", "Cà chua", "Tỏi"],
  },
  {
    id: "6",
    name: "Bánh mì trứng",
    description: "Bữa sáng đơn giản, tiện lợi và ngon miệng.",
    image:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop",
    minutes: 8,
    calories: 310,
    match: 100,
    category: "Bữa sáng",
    ingredients: ["Bánh mì", "Trứng gà"],
  },
];

const FILTERS: {
  id: FilterType;
  label: string;
}[] = [
  { id: "all", label: "Tất cả" },
  { id: "full", label: "Đủ nguyên liệu" },
  { id: "quick", label: "Nấu nhanh" },
  { id: "missing", label: "Cần mua thêm" },
];

export default function RecipesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string }>();

  const initialSearch = typeof params.search === "string" ? params.search : "";

  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState<FilterType>("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const filteredRecipes = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");

    return RECIPES.filter((recipe) => {
      const matchesSearch =
        !keyword ||
        recipe.name.toLocaleLowerCase("vi-VN").includes(keyword) ||
        recipe.category.toLocaleLowerCase("vi-VN").includes(keyword) ||
        recipe.ingredients.some((ingredient) =>
          ingredient.toLocaleLowerCase("vi-VN").includes(keyword),
        );

      let matchesFilter = true;

      if (filter === "full") {
        matchesFilter = recipe.match === 100;
      } else if (filter === "quick") {
        matchesFilter = recipe.minutes <= 15;
      } else if (filter === "missing") {
        matchesFilter = recipe.match < 100;
      }

      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const featuredRecipes = RECIPES.filter((recipe) => recipe.match === 100);

  const featured = featuredRecipes[featuredIndex % featuredRecipes.length];

  const goBack = () => {
    Keyboard.dismiss();

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home" as any);
    }
  };

  const openRecipe = (recipe: Recipe) => {
    Keyboard.dismiss();

    router.push({
      pathname: "/recipe-detail" as any,
      params: {
        id: recipe.id,
        name: recipe.name,
      },
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const refreshFeatured = () => {
    setFeaturedIndex((previous) => previous + 1);
  };

  const applyQuickFilter = () => {
    setFilter("quick");
    setSearch("");
    Keyboard.dismiss();
  };

  const cycleFilter = () => {
    const index = FILTERS.findIndex((item) => item.id === filter);
    const next = FILTERS[(index + 1) % FILTERS.length];
    setFilter(next.id);
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      {/* HEADER CHUNG */}
      <AppHeader />

      {/* HEADER TRANG */}
      <View style={styles.pageHeader}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={20} color={C.orange} />
        </Pressable>

        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>Gợi ý món ăn</Text>

          <Text style={styles.pageSubtitle}>
            Khám phá công thức phù hợp với bạn
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <ChefHat size={21} color={C.orange} />
        </View>
      </View>

      {/* NỘI DUNG CUỘN */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* THANH TÌM KIẾM */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={19} color={C.orange} />

            <TextInput
              style={styles.searchInput}
              placeholder="Tìm món ăn, nguyên liệu..."
              placeholderTextColor="#A18B81"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
            />

            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <X size={17} color={C.muted} />
              </Pressable>
            )}
          </View>

          <Pressable style={styles.filterButton} onPress={cycleFilter}>
            <SlidersHorizontal size={21} color={C.orange} />
          </Pressable>
        </View>

        {/* BỘ LỌC */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          {FILTERS.map((item) => {
            const active = filter === item.id;

            return (
              <Pressable
                key={item.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(item.id)}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* GỢI Ý NẤU NHANH */}
        <Pressable style={styles.quickBanner} onPress={applyQuickFilter}>
          <View style={styles.quickBannerIcon}>
            <Clock3 size={20} color={C.orange} />
          </View>

          <View style={styles.quickBannerContent}>
            <Text style={styles.quickBannerTitle}>Hôm nay muốn nấu nhanh?</Text>

            <Text style={styles.quickBannerSubtitle}>
              Khám phá các món ăn trong 15 phút
            </Text>
          </View>

          <ArrowRight size={18} color={C.orange} />
        </Pressable>

        {/* GỢI Ý NỔI BẬT */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Sparkles size={18} color={C.orange} />
            <Text style={styles.sectionTitle}>Chef AI đề xuất</Text>
          </View>

          <Pressable style={styles.refreshButton} onPress={refreshFeatured}>
            <RefreshCw size={15} color={C.orange} />
            <Text style={styles.refreshText}>Đổi món</Text>
          </Pressable>
        </View>

        <View style={styles.featuredCard}>
          <View style={styles.featuredTopRow}>
            <View style={styles.featuredBadge}>
              <Sparkles size={12} color={C.white} />
              <Text style={styles.featuredBadgeText}>MÓN ĂN ĐỀ XUẤT</Text>
            </View>

            <Pressable
              style={styles.featuredHeart}
              onPress={() => toggleFavorite(featured.id)}
            >
              <Heart
                size={20}
                color={C.white}
                fill={favorites.includes(featured.id) ? C.white : "transparent"}
              />
            </Pressable>
          </View>

          <View style={styles.featuredMain}>
            <View style={styles.featuredInfo}>
              <View style={styles.featuredMatch}>
                <CheckCircle2 size={14} color={C.green} />
                <Text style={styles.featuredMatchText}>
                  Khớp {featured.match}%
                </Text>
              </View>

              <Text style={styles.featuredName} numberOfLines={3}>
                {featured.name}
              </Text>

              <Text style={styles.featuredDescription} numberOfLines={2}>
                {featured.description}
              </Text>
            </View>

            <Image
              source={{ uri: featured.image }}
              style={styles.featuredImage}
              resizeMode="cover"
            />
          </View>

          <View style={styles.featuredFooter}>
            <View style={styles.featuredMeta}>
              <Clock3 size={14} color="#FFE8DB" />
              <Text style={styles.featuredMetaText}>
                {featured.minutes} phút
              </Text>

              <Flame size={14} color="#FFE8DB" />
              <Text style={styles.featuredMetaText}>
                {featured.calories} kcal
              </Text>
            </View>

            <Pressable
              style={styles.featuredButton}
              onPress={() => openRecipe(featured)}
            >
              <Text style={styles.featuredButtonText}>Xem công thức</Text>
              <ArrowRight size={15} color={C.orange} />
            </Pressable>
          </View>
        </View>

        {/* DANH SÁCH MÓN ĂN */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <UtensilsCrossed size={18} color={C.orange} />
            <Text style={styles.sectionTitle}>Công thức dành cho bạn</Text>
          </View>

          <Text style={styles.resultCount}>{filteredRecipes.length} món</Text>
        </View>

        <Text style={styles.sectionDescription}>
          Chọn món phù hợp với thời gian và nguyên liệu
        </Text>

        {filteredRecipes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Search size={30} color={C.orange} />

            <Text style={styles.emptyTitle}>Chưa tìm thấy món phù hợp</Text>

            <Text style={styles.emptyDescription}>
              Thử tìm bằng tên nguyên liệu khác hoặc xóa bộ lọc.
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              <Text style={styles.emptyButtonText}>Xem tất cả món ăn</Text>
            </Pressable>
          </View>
        ) : (
          filteredRecipes.map((recipe) => {
            const isFavorite = favorites.includes(recipe.id);

            return (
              <View key={recipe.id} style={styles.recipeCard}>
                <Pressable onPress={() => openRecipe(recipe)}>
                  <Image
                    source={{ uri: recipe.image }}
                    style={styles.recipeImage}
                    resizeMode="cover"
                  />
                </Pressable>

                <View style={styles.recipeInfo}>
                  <View style={styles.recipeTopRow}>
                    <View
                      style={[
                        styles.matchBadge,
                        recipe.match === 100
                          ? styles.matchBadgeFull
                          : styles.matchBadgePartial,
                      ]}
                    >
                      {recipe.match === 100 ? (
                        <CheckCircle2 size={12} color={C.green} />
                      ) : (
                        <ShoppingCart size={12} color={C.orange} />
                      )}

                      <Text
                        style={[
                          styles.matchBadgeText,
                          {
                            color: recipe.match === 100 ? C.green : C.orange,
                          },
                        ]}
                      >
                        Khớp {recipe.match}%
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => toggleFavorite(recipe.id)}
                      hitSlop={8}
                    >
                      <Heart
                        size={20}
                        color={isFavorite ? "#E54848" : C.muted}
                        fill={isFavorite ? "#E54848" : "transparent"}
                      />
                    </Pressable>
                  </View>

                  <Pressable onPress={() => openRecipe(recipe)}>
                    <Text style={styles.recipeName} numberOfLines={2}>
                      {recipe.name}
                    </Text>
                  </Pressable>

                  <Text style={styles.recipeDescription} numberOfLines={2}>
                    {recipe.description}
                  </Text>

                  <View style={styles.recipeMetaRow}>
                    <Clock3 size={13} color={C.muted} />
                    <Text style={styles.recipeMetaText}>
                      {recipe.minutes} phút
                    </Text>

                    <Flame size={13} color={C.orange} />
                    <Text style={styles.recipeMetaText}>
                      {recipe.calories} kcal
                    </Text>
                  </View>

                  <Pressable
                    style={styles.recipeAction}
                    onPress={() => openRecipe(recipe)}
                  >
                    <Text style={styles.recipeActionText}>Xem chi tiết</Text>
                    <ArrowRight size={15} color={C.orange} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {/* DANH SÁCH MUA SẮM */}
        <Pressable
          style={styles.shoppingBanner}
          onPress={() => router.push("/shopping-list" as any)}
        >
          <View style={styles.shoppingIcon}>
            <ShoppingCart size={23} color={C.orange} />
          </View>

          <View style={styles.shoppingContent}>
            <Text style={styles.shoppingTitle}>Thiếu nguyên liệu?</Text>

            <Text style={styles.shoppingDescription}>
              Lên danh sách mua sắm để chuẩn bị món ngon.
            </Text>

            <View style={styles.shoppingLink}>
              <Text style={styles.shoppingLinkText}>Mở danh sách mua sắm</Text>
              <ArrowRight size={14} color={C.orange} />
            </View>
          </View>
        </Pressable>

        {/* MẸO NHỎ */}
        <View style={styles.tipCard}>
          <Leaf size={21} color={C.green} />

          <View style={{ flex: 1 }}>
            <Text style={styles.tipTitle}>Mẹo nấu ăn thông minh</Text>

            <Text style={styles.tipDescription}>
              Ưu tiên những nguyên liệu sắp hết hạn để tiết kiệm chi phí và giảm
              lãng phí thực phẩm.
            </Text>
          </View>
        </View>
      </ScrollView>

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
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 14,
    paddingBottom: 20,
  },

  // HEADER TRANG
  pageHeader: {
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeading: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
  },
  pageSubtitle: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },
  headerIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },

  // SEARCH
  searchRow: {
    marginHorizontal: 15,
    flexDirection: "row",
    gap: 8,
    marginBottom: 13,
  },
  searchBox: {
    flex: 1,
    height: 45,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: C.dark,
    paddingVertical: 10,
  },
  filterButton: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: C.peach,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // FILTERS
  filtersScroll: {
    marginBottom: 14,
  },
  filtersRow: {
    paddingHorizontal: 15,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },
  filterText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.muted,
  },
  filterTextActive: {
    color: C.white,
  },

  // QUICK BANNER
  quickBanner: {
    marginHorizontal: 15,
    marginBottom: 23,
    padding: 12,
    borderRadius: 13,
    backgroundColor: C.peach,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  quickBannerContent: {
    flex: 1,
  },
  quickBannerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
  },
  quickBannerSubtitle: {
    fontSize: 10,
    color: C.muted,
    marginTop: 5,
  },

  // SECTION
  sectionHeader: {
    marginHorizontal: 17,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.dark,
  },
  sectionDescription: {
    marginHorizontal: 17,
    marginTop: -4,
    marginBottom: 12,
    fontSize: 11,
    color: C.muted,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.orange,
  },
  resultCount: {
    fontSize: 11,
    fontWeight: "800",
    color: C.orange,
  },

  // FEATURED RECIPE
  featuredCard: {
    marginHorizontal: 15,
    marginBottom: 25,
    padding: 14,
    borderRadius: 18,
    backgroundColor: C.orange,
    overflow: "hidden",
  },
  featuredTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.deepOrange,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
  },
  featuredHeart: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredMain: {
    flexDirection: "row",
    gap: 10,
  },
  featuredInfo: {
    flex: 1,
  },
  featuredMatch: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.mint,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 9,
  },
  featuredMatchText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.green,
  },
  featuredName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: C.white,
  },
  featuredDescription: {
    fontSize: 10,
    lineHeight: 16,
    color: "#FFE7D9",
    marginTop: 7,
  },
  featuredImage: {
    width: 113,
    height: 115,
    borderRadius: 13,
    backgroundColor: C.peach,
  },
  featuredFooter: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  featuredMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  featuredMetaText: {
    fontSize: 10,
    color: C.white,
    marginRight: 4,
  },
  featuredButton: {
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  featuredButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.orange,
  },

  // RECIPE LIST
  recipeCard: {
    marginHorizontal: 15,
    marginBottom: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 10,
    flexDirection: "row",
    gap: 12,
  },
  recipeImage: {
    width: 111,
    height: 139,
    borderRadius: 11,
    backgroundColor: C.peach,
  },
  recipeInfo: {
    flex: 1,
    justifyContent: "space-between",
    minWidth: 0,
  },
  recipeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  matchBadgeFull: {
    backgroundColor: C.mint,
  },
  matchBadgePartial: {
    backgroundColor: C.peach,
  },
  matchBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  recipeName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: C.dark,
    marginTop: 7,
  },
  recipeDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: C.muted,
    marginTop: 5,
  },
  recipeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },
  recipeMetaText: {
    fontSize: 9,
    color: C.muted,
    marginRight: 3,
  },
  recipeAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 9,
  },
  recipeActionText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.orange,
  },

  // EMPTY
  emptyCard: {
    marginHorizontal: 15,
    borderRadius: 15,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    padding: 25,
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.dark,
    marginTop: 12,
  },
  emptyDescription: {
    fontSize: 11,
    lineHeight: 18,
    color: C.muted,
    textAlign: "center",
    marginTop: 8,
  },
  emptyButton: {
    backgroundColor: C.orange,
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 15,
  },
  emptyButtonText: {
    color: C.white,
    fontSize: 11,
    fontWeight: "800",
  },

  // SHOPPING
  shoppingBanner: {
    marginHorizontal: 15,
    marginTop: 11,
    marginBottom: 16,
    backgroundColor: C.peach,
    borderRadius: 15,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  shoppingIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shoppingContent: {
    flex: 1,
  },
  shoppingTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },
  shoppingDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted,
    marginTop: 5,
  },
  shoppingLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 9,
  },
  shoppingLinkText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.orange,
  },

  // TIP
  tipCard: {
    marginHorizontal: 15,
    backgroundColor: C.mint,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    gap: 10,
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
});
