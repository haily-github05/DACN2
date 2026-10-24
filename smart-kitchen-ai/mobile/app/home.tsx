import React, { useCallback, useMemo, useState } from "react";

import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { getAuthUser, type AuthUser } from "../lib/auth";
import { useRouter, useFocusEffect } from "expo-router";
import { getHomeData, type HomeRecipe, type HomeData } from "../lib/homeApi";
import { avatarSource } from "../lib/profileApi";

import {
  Search,
  Sparkles,
  ArrowRight,
  Refrigerator,
  AlertTriangle,
  ScanLine,
  Plus,
  CalendarDays,
  ShoppingCart,
  Clock3,
  Flame,
  ChefHat,
  Users,
  Leaf,
  X,
  Heart,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";

import BottomNav from "../components/BottomNav";

import FloatingAIAssistant from "../components/FloatingAIAssistant";

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

  greenLight: "#E9F5EB",
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 11) {
    return {
      title: "CHÀO BUỔI SÁNG ☀️",

      question: "Hôm nay mình nấu gì ngon?",
    };
  }

  if (hour < 17) {
    return {
      title: "CHÀO BUỔI CHIỀU 🌤️",

      question: "Bữa tiếp theo nấu món gì?",
    };
  }

  return {
    title: "CHÀO BUỔI TỐI 🌙",

    question: "Tối nay ăn gì thật ngon?",
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [search, setSearch] = useState("");

  const [favorites, setFavorites] = useState<string[]>([]);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loadingHome, setLoadingHome] = useState(true);
  const [homeError, setHomeError] = useState("");
  const imageUrl = avatarSource(homeData?.user?.avatar_url ?? null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoadingHome(true);
        setHomeError("");
        try {
          const user = await getAuthUser();

          if (!user) {
            if (active) {
              setCurrentUser(null);
              router.replace("/login");
            }
            return;
          }

          if (active) {
            setCurrentUser(user);
          }

          const data = await getHomeData();

          if (active) {
            setHomeData(data);
          }
        } catch (error) {
          if (active) {
            setHomeData(null);
            setHomeError(
              error instanceof Error
                ? error.message
                : "Không thể tải dữ liệu Home",
            );
          }
        } finally {
          if (active) setLoadingHome(false);
        }
      };
      load();
      return () => {
        active = false;
      };
    }, []),
  );

  const greeting = useMemo(() => getGreeting(), []);

  const goTo = (path: string) => {
    Keyboard.dismiss();

    router.push(path as any);
  };

  const searchRecipes = () => {
    const keyword = search.trim();

    if (!keyword) {
      Alert.alert(
        "Tìm kiếm món ăn",

        "Hãy nhập tên món ăn hoặc nguyên liệu bạn muốn tìm.",
      );

      return;
    }

    Keyboard.dismiss();

    router.push({
      pathname: "/recipes" as any,

      params: { search: keyword },
    });
  };

  const openRecipe = (recipe: HomeRecipe) => {
    router.push({
      pathname: "/recipe-detail" as any,

      params: {
        id: String(recipe.recipe_id),

        name: recipe.name,
      },
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const quickActions = [
    {
      title: "Quét nguyên liệu",

      subtitle: "Nhận diện thực phẩm",

      icon: ScanLine,

      path: "/scan",

      background: C.peach,
    },

    {
      title: "Thêm thủ công",

      subtitle: "Cập nhật kho nhanh",

      icon: Plus,

      path: "/add-ingredient",

      background: C.peach,
    },

    {
      title: "Lập thực đơn",

      subtitle: "Kế hoạch 7 ngày",

      icon: CalendarDays,

      path: "/meal-plan",

      background: C.greenLight,
    },

    {
      title: "Danh sách mua",

      subtitle: "Đi chợ thông minh",

      icon: ShoppingCart,

      path: "/shopping-list",

      background: C.peach,
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      {/* HEADER CHUNG */}

      <AppHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* LỜI CHÀO */}

        <View style={styles.greetingUserRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{greeting.title}</Text>

            <Text style={styles.greetingTitle}>
              {homeData?.user?.full_name || "Người dùng"}
            </Text>

            <Text style={styles.greetingDescription}>{greeting.question}</Text>
          </View>

          <Pressable
            style={styles.userAvatar}
            onPress={() => router.push("/profile")}
          >
            {avatarSource(homeData?.user?.avatar_url ?? null) ? (
              <Image
                source={{
                  uri: avatarSource(homeData?.user?.avatar_url ?? null)!,
                }}
                style={styles.userAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.userAvatarText}>
                {homeData?.user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            )}
          </Pressable>
        </View>

        {/* TÌM KIẾM */}

        <View style={styles.searchContainer}>
          <Search size={20} color={C.orange} />

          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm món ăn, nguyên liệu, công thức..."
            placeholderTextColor="#A18B81"
            returnKeyType="search"
            onSubmitEditing={searchRecipes}
          />

          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <X size={18} color={C.muted} />
            </Pressable>
          ) : (
            <Pressable onPress={() => goTo("/recipes")} hitSlop={8}>
              <ArrowRight size={19} color={C.orange} />
            </Pressable>
          )}
        </View>

        {/* CHEF AI */}

        <View style={styles.aiCard}>
          <View style={styles.aiDecoration} />

          <View style={styles.aiTopRow}>
            <View style={styles.aiBadge}>
              <Sparkles size={13} color={C.white} />

              <Text style={styles.aiBadgeText}>CHEF AI GỢI Ý</Text>
            </View>

            <View style={styles.aiEmojiCircle}>
              <Text style={styles.aiEmoji}>🍲</Text>
            </View>
          </View>

          <Text style={styles.aiTitle}>
            Có gì trong tủ lạnh,{"\n"}nấu ngon ngay!
          </Text>

          <Text style={styles.aiDescription}>
            AI giúp bạn chọn món phù hợp,{"\n"}
            ưu tiên nguyên liệu sắp hết hạn.
          </Text>

          <Pressable style={styles.aiButton} onPress={() => goTo("/recipes")}>
            <Sparkles size={17} color={C.orange} />

            <Text style={styles.aiButtonText}>Khám phá món ăn với AI</Text>

            <ArrowRight size={18} color={C.orange} />
          </Pressable>
        </View>

        {/* KHO THỰC PHẨM */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kho thực phẩm của bạn</Text>

          <Pressable style={styles.sectionLink} onPress={() => goTo("/pantry")}>
            <Text style={styles.sectionLinkText}>Xem kho</Text>

            <ArrowRight size={15} color={C.orange} />
          </Pressable>
        </View>

        <Pressable style={styles.pantryCard} onPress={() => goTo("/pantry")}>
          <View style={styles.pantryTop}>
            <View style={styles.pantryIconBox}>
              <Refrigerator size={27} color={C.orange} />
            </View>

            <View style={styles.pantryInfo}>
              <Text style={styles.pantryNumber}>
                {loadingHome ? "..." : (homeData?.pantry.total ?? "—")}
              </Text>

              <Text style={styles.pantryLabel}>Nguyên liệu đang có</Text>
            </View>

            <ArrowRight size={19} color={C.orange} />
          </View>

          <View style={styles.pantryDivider} />

          <View style={styles.expiryRow}>
            <View style={styles.expiryIcon}>
              <AlertTriangle size={17} color={C.orange} />
            </View>

            <Text style={styles.expiryText}>
              {loadingHome
                ? "Đang kiểm tra hạn sử dụng..."
                : `${homeData?.pantry.expiringSoon ?? "—"} nguyên liệu sắp hết hạn`}
            </Text>

            <ArrowRight size={16} color={C.orange} />
          </View>
        </Pressable>

        {/* THAO TÁC NHANH */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tiện ích cho căn bếp</Text>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Pressable
                key={action.path}
                style={styles.quickCard}
                onPress={() => goTo(action.path)}
              >
                <View
                  style={[
                    styles.quickIconBox,

                    { backgroundColor: action.background },
                  ]}
                >
                  <Icon size={23} color={C.orange} />
                </View>

                <Text style={styles.quickTitle}>{action.title}</Text>

                <Text style={styles.quickSubtitle}>{action.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* GỢI Ý MÓN ĂN */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hôm nay ăn gì?</Text>

          <Pressable
            style={styles.sectionLink}
            onPress={() => goTo("/recipes")}
          >
            <Text style={styles.sectionLinkText}>Xem tất cả</Text>

            <ArrowRight size={15} color={C.orange} />
          </Pressable>
        </View>

        <Text style={styles.sectionDescription}>
          Gợi ý món ngon, dễ làm cho bạn
        </Text>

        {loadingHome ? (
          <ActivityIndicator
            color={C.orange}
            size="large"
            style={{ marginVertical: 24 }}
          />
        ) : homeError ? (
          <Text style={styles.sectionDescription}>{homeError}</Text>
        ) : !homeData?.recipes.length ? (
          <Text style={styles.sectionDescription}>
            Chưa có công thức trong cơ sở dữ liệu.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recipeList}
            style={styles.recipeScroll}
          >
            {homeData.recipes.map((recipe) => {
              const id = String(recipe.recipe_id);
              const isFavorite = favorites.includes(id);
              const minutes =
                Number(recipe.prep_time || 0) + Number(recipe.cook_time || 0);
              return (
                <View key={id} style={styles.recipeCard}>
                  <Pressable
                    style={styles.recipeImageWrapper}
                    onPress={() => openRecipe(recipe)}
                  >
                    {recipe.image_url ? (
                      <Image
                        source={{ uri: recipe.image_url }}
                        style={styles.recipeImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.recipeImage,
                          { alignItems: "center", justifyContent: "center" },
                        ]}
                      >
                        <ChefHat size={40} color={C.orange} />
                      </View>
                    )}
                    {recipe.region ? (
                      <View style={styles.recipeBadge}>
                        <Text style={styles.recipeBadgeText}>
                          {recipe.region}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable
                    style={styles.heartButton}
                    onPress={() => toggleFavorite(id)}
                  >
                    <Heart
                      size={17}
                      color={isFavorite ? "#E54848" : C.muted}
                      fill={isFavorite ? "#E54848" : "transparent"}
                    />
                  </Pressable>
                  <Pressable onPress={() => openRecipe(recipe)}>
                    <Text style={styles.recipeName} numberOfLines={2}>
                      {recipe.name}
                    </Text>
                  </Pressable>
                  <View style={styles.recipeMeta}>
                    {minutes > 0 ? (
                      <>
                        <Clock3 size={12} color={C.muted} />
                        <Text style={styles.recipeMetaText}>
                          {minutes} phút
                        </Text>
                      </>
                    ) : null}
                    {recipe.estimated_cost != null ? (
                      <Text style={styles.recipeMetaText}>
                        {Number(recipe.estimated_cost).toLocaleString("vi-VN")}đ
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    style={styles.recipeLink}
                    onPress={() => openRecipe(recipe)}
                  >
                    <Text style={styles.recipeLinkText}>Xem công thức</Text>
                    <ArrowRight size={14} color={C.orange} />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* CẢNH BÁO CHỐNG LÃNG PHÍ */}

        <Pressable style={styles.tipCard} onPress={() => goTo("/pantry")}>
          <View style={styles.tipIcon}>
            <Leaf size={24} color={C.green} />
          </View>

          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Đừng để thực phẩm bị lãng phí</Text>

            <Text style={styles.tipDescription}>
              Ưu tiên sử dụng nguyên liệu gần hết hạn để bữa ăn luôn tươi ngon.
            </Text>

            <View style={styles.tipLink}>
              <Text style={styles.tipLinkText}>Xem nguyên liệu</Text>

              <ArrowRight size={14} color={C.orange} />
            </View>
          </View>
        </Pressable>

        {/* CỘNG ĐỒNG */}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Góc bếp cộng đồng</Text>
        </View>

        <Pressable
          style={styles.communityCard}
          onPress={() => goTo("/community")}
        >
          <View style={styles.communityImageBox}>
            <Text style={styles.communityEmoji}>👩‍🍳</Text>
          </View>

          <View style={styles.communityContent}>
            <Text style={styles.communityEyebrow}>CHIA SẺ CÔNG THỨC</Text>

            <Text style={styles.communityTitle}>
              Cùng nhau nấu ngon mỗi ngày
            </Text>

            <Text style={styles.communityDescription}>
              Học hỏi mẹo bếp và khám phá công thức mới.
            </Text>

            <View style={styles.communityLink}>
              <Users size={15} color={C.orange} />

              <Text style={styles.communityLinkText}>Khám phá cộng đồng</Text>

              <ArrowRight size={14} color={C.orange} />
            </View>
          </View>
        </Pressable>

        {/* CUỐI TRANG */}

        <View style={styles.footer}>
          <ChefHat size={17} color={C.orange} />

          <Text style={styles.footerText}>
            Smart Kitchen AI – Nấu ngon, sống xanh
          </Text>
        </View>
      </ScrollView>

      <View style={{ position: "relative" }}>
        <FloatingAIAssistant />

        <BottomNav />
      </View>
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
    paddingTop: 18,

    paddingBottom: 24,
  },

  // GREETING

  greetingSection: {
    paddingHorizontal: 18,
  },

  eyebrow: {
    fontSize: 10,

    fontWeight: "800",

    color: C.orange,

    letterSpacing: 0.8,

    marginBottom: 8,
  },

  greetingTitle: {
    fontSize: 23,

    fontWeight: "800",

    color: C.dark,

    lineHeight: 31,
  },

  greetingDescription: {
    fontSize: 12,

    color: C.muted,

    marginTop: 6,

    lineHeight: 18,
  },

  // SEARCH

  searchContainer: {
    marginHorizontal: 16,

    marginTop: 18,

    marginBottom: 16,

    minHeight: 49,

    borderRadius: 14,

    backgroundColor: C.white,

    borderWidth: 1,

    borderColor: C.border,

    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,

    fontSize: 12,

    color: C.dark,

    paddingVertical: 12,
  },

  // AI

  aiCard: {
    marginHorizontal: 16,

    backgroundColor: C.orange,

    borderRadius: 20,

    padding: 15,

    overflow: "hidden",

    marginBottom: 23,
  },

  aiDecoration: {
    position: "absolute",

    width: 165,

    height: 165,

    borderRadius: 83,

    backgroundColor: C.deepOrange,

    right: -80,

    top: -70,

    opacity: 0.55,
  },

  aiTopRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 7,
  },

  aiBadge: {
    flexDirection: "row",

    alignItems: "center",

    gap: 6,

    backgroundColor: C.deepOrange,

    borderRadius: 20,

    paddingHorizontal: 11,

    paddingVertical: 8,
  },

  aiBadgeText: {
    fontSize: 10,

    fontWeight: "800",

    color: C.white,

    letterSpacing: 0.4,
  },

  aiEmojiCircle: {
    width: 64,

    height: 64,

    borderRadius: 32,

    backgroundColor: "rgba(255,255,255,0.15)",

    alignItems: "center",

    justifyContent: "center",
  },

  aiEmoji: {
    fontSize: 36,
  },

  aiTitle: {
    fontSize: 23,

    lineHeight: 30,

    fontWeight: "800",

    color: C.white,

    marginTop: -4,
  },

  aiDescription: {
    fontSize: 12,

    lineHeight: 19,

    color: "#FFE9DD",

    marginTop: 9,

    marginBottom: 17,
  },

  aiButton: {
    minHeight: 43,

    backgroundColor: C.white,

    borderRadius: 11,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 8,

    paddingHorizontal: 10,
  },

  aiButtonText: {
    fontSize: 12,

    fontWeight: "800",

    color: C.orange,
  },

  // SECTION

  sectionHeader: {
    marginHorizontal: 18,

    marginBottom: 12,

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    gap: 8,
  },

  sectionTitle: {
    fontSize: 17,

    fontWeight: "800",

    color: C.dark,

    flexShrink: 1,
  },

  sectionLink: {
    flexDirection: "row",

    alignItems: "center",

    gap: 3,
  },

  sectionLinkText: {
    fontSize: 11,

    fontWeight: "800",

    color: C.orange,
  },

  sectionDescription: {
    marginHorizontal: 18,

    fontSize: 11,

    color: C.muted,

    marginTop: -4,

    marginBottom: 12,
  },

  // PANTRY

  pantryCard: {
    marginHorizontal: 16,

    marginBottom: 25,

    backgroundColor: C.white,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: C.border,

    padding: 14,
  },

  pantryTop: {
    flexDirection: "row",

    alignItems: "center",

    gap: 11,
  },

  pantryIconBox: {
    width: 48,

    height: 48,

    backgroundColor: C.peach,

    borderRadius: 13,

    alignItems: "center",

    justifyContent: "center",
  },

  pantryInfo: {
    flex: 1,
  },

  pantryNumber: {
    fontSize: 26,

    fontWeight: "800",

    color: C.dark,
  },

  pantryLabel: {
    fontSize: 11,

    color: C.muted,

    marginTop: 1,
  },

  pantryDivider: {
    height: 1,

    backgroundColor: C.border,

    marginVertical: 13,
  },

  expiryRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,
  },

  expiryIcon: {
    width: 28,

    height: 28,

    borderRadius: 8,

    backgroundColor: C.peach,

    alignItems: "center",

    justifyContent: "center",
  },

  expiryText: {
    flex: 1,

    fontSize: 12,

    fontWeight: "800",

    color: C.orange,
  },

  // QUICK ACTIONS

  quickGrid: {
    marginHorizontal: 16,

    flexDirection: "row",

    flexWrap: "wrap",

    justifyContent: "space-between",

    rowGap: 10,

    marginBottom: 25,
  },

  quickCard: {
    width: "48.5%",

    minHeight: 111,

    borderRadius: 15,

    borderWidth: 1,

    borderColor: C.border,

    backgroundColor: C.white,

    padding: 12,
  },

  quickIconBox: {
    width: 42,

    height: 42,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 9,
  },

  quickTitle: {
    fontSize: 12,

    fontWeight: "800",

    color: C.dark,
  },

  quickSubtitle: {
    fontSize: 10,

    color: C.muted,

    marginTop: 5,
  },

  // RECIPES

  recipeScroll: {
    marginBottom: 22,
  },

  recipeList: {
    paddingHorizontal: 16,

    gap: 12,
  },

  recipeCard: {
    width: 175,

    borderRadius: 15,

    borderWidth: 1,

    borderColor: C.border,

    backgroundColor: C.white,

    padding: 9,
  },

  recipeImageWrapper: {
    height: 105,

    borderRadius: 11,

    overflow: "hidden",

    backgroundColor: C.peach,
  },

  recipeImage: {
    width: "100%",

    height: "100%",
  },

  recipeBadge: {
    position: "absolute",

    left: 7,

    top: 7,

    borderRadius: 8,

    backgroundColor: C.white,

    paddingHorizontal: 8,

    paddingVertical: 5,
  },

  recipeBadgeText: {
    fontSize: 9,

    fontWeight: "800",

    color: C.green,
  },

  heartButton: {
    position: "absolute",

    top: 17,

    right: 17,

    width: 29,

    height: 29,

    borderRadius: 15,

    backgroundColor: C.white,

    alignItems: "center",

    justifyContent: "center",
  },

  recipeName: {
    fontSize: 12,

    fontWeight: "800",

    color: C.dark,

    lineHeight: 17,

    marginTop: 10,

    minHeight: 34,
  },

  recipeMeta: {
    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    marginTop: 6,
  },

  recipeMetaText: {
    fontSize: 9,

    color: C.muted,
  },

  recipeLink: {
    marginTop: 12,

    flexDirection: "row",

    alignItems: "center",

    gap: 5,
  },

  recipeLinkText: {
    fontSize: 11,

    fontWeight: "800",

    color: C.orange,
  },

  // ANTI-WASTE TIP

  tipCard: {
    marginHorizontal: 16,

    marginBottom: 25,

    padding: 14,

    backgroundColor: C.greenLight,

    borderRadius: 16,

    flexDirection: "row",

    gap: 12,
  },

  tipIcon: {
    width: 42,

    height: 42,

    borderRadius: 12,

    backgroundColor: C.white,

    alignItems: "center",

    justifyContent: "center",
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    fontSize: 13,

    fontWeight: "800",

    color: C.green,

    lineHeight: 19,
  },

  tipDescription: {
    fontSize: 11,

    color: C.green,

    lineHeight: 17,

    marginTop: 5,
  },

  tipLink: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    marginTop: 10,
  },

  tipLinkText: {
    fontSize: 11,

    fontWeight: "800",

    color: C.orange,
  },

  // COMMUNITY

  communityCard: {
    marginHorizontal: 16,

    backgroundColor: C.white,

    borderRadius: 16,

    borderWidth: 1,

    borderColor: C.border,

    padding: 12,

    flexDirection: "row",

    gap: 13,
  },

  communityImageBox: {
    width: 91,

    minHeight: 126,

    borderRadius: 12,

    backgroundColor: C.peach,

    alignItems: "center",

    justifyContent: "center",
  },

  communityEmoji: {
    fontSize: 42,
  },

  communityContent: {
    flex: 1,

    justifyContent: "center",
  },

  communityEyebrow: {
    fontSize: 9,

    fontWeight: "800",

    color: C.orange,

    letterSpacing: 0.5,
  },

  communityTitle: {
    fontSize: 15,

    lineHeight: 21,

    fontWeight: "800",

    color: C.dark,

    marginTop: 7,
  },

  communityDescription: {
    fontSize: 10,

    color: C.muted,

    lineHeight: 15,

    marginTop: 6,
  },

  communityLink: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    marginTop: 10,
  },

  communityLinkText: {
    fontSize: 10,

    fontWeight: "800",

    color: C.orange,
  },

  // FOOTER

  footer: {
    marginTop: 23,

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    gap: 7,
  },

  footerText: {
    fontSize: 10,

    color: C.muted,
  },

  greetingUserRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginHorizontal: 16,
  },

  userAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FCE5D6",
    borderWidth: 2,
    borderColor: "#F05A0A",
    alignItems: "center",
    justifyContent: "center",
  },

  userAvatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#A23A00",
  },
  userAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 29,
  },
});
