import React, { useState } from "react";
import AppHeader from "../components/AppHeader";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Search,
  Sparkles,
  Camera,
  Plus,
  Package,
  Clock3,
  ShoppingCart,
  House,
  Compass,
  UserRound,
  ChefHat,
  ArrowRight,
  ChevronRight,
  TriangleAlert,
  CalendarDays,
} from "lucide-react-native";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  white: "#FFFFFF",
  green: "#39845A",
};

const recipes = [
  {
    emoji: "🍣",
    name: "Cá hồi áp chảo",
    match: "92% phù hợp",
    missing: "Thiếu: 1 quả chanh",
    time: "20 phút · Dễ nấu",
  },
  {
    emoji: "🥣",
    name: "Canh bí đỏ",
    match: "88% phù hợp",
    missing: "Đủ nguyên liệu",
    time: "25 phút · Dễ nấu",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const comingSoon = (feature: string) => {
    Alert.alert(
      feature,
      "Chức năng này sẽ được phát triển ở các màn hình tiếp theo.",
    );
  };

  const openRecipe = (name: string) => {
    comingSoon(`Chi tiết món: ${name}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader showNotification unreadCount={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* GREETING */}
        <View style={styles.greeting}>
          <View>
            <Text style={styles.hello}>Chào buổi sáng 👋</Text>
            <Text style={styles.subtitle}>
              Hôm nay mình cùng nấu món ngon nhé!
            </Text>
          </View>

          {/* <View style={styles.avatar}>
            <UserRound size={23} color={C.orange} />
          </View> */}
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Search size={20} color={C.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm món ăn, công thức, nguyên liệu..."
            placeholderTextColor="#A18B81"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (search.trim()) {
                comingSoon(`Tìm kiếm: ${search.trim()}`);
              }
            }}
          />
        </View>

        {/* AI BANNER */}
        <View style={styles.banner}>
          <View style={styles.bannerBadge}>
            <Sparkles size={15} color="#FFE0BA" />
            <Text style={styles.bannerBadgeText}>SMART KITCHEN AI</Text>
          </View>

          <Text style={styles.bannerTitle}>Hôm nay ăn gì?</Text>
          <Text style={styles.bannerDescription}>
            Gợi ý món từ thực phẩm bạn đang có
          </Text>

          <Pressable
            style={styles.bannerButton}
            onPress={() => comingSoon("Khám phá món ăn bằng AI")}
          >
            <Text style={styles.bannerButtonText}>Khám phá món ăn</Text>
            <ArrowRight size={16} color={C.orange} />
          </Pressable>

          <Text style={styles.bannerEmoji}>🍲</Text>
        </View>

        {/* PANTRY */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Kho thực phẩm của bạn</Text>
          <Pressable onPress={() => comingSoon("Kho thực phẩm")}>
            <Text style={styles.sectionLink}>Xem kho →</Text>
          </Pressable>
        </View>

        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Nguyên liệu</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: "#C17B22" }]}>03</Text>
            <Text style={styles.statLabel}>Sắp hết hạn</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>02</Text>
            <Text style={styles.statLabel}>Cần bổ sung</Text>
          </View>
        </View>

        {/* EXPIRY ALERT */}
        <Pressable
          style={styles.expiryCard}
          onPress={() => comingSoon("Thực phẩm sắp hết hạn")}
        >
          <View style={styles.expiryHeader}>
            <TriangleAlert size={19} color="#B87418" />
            <Text style={styles.expiryTitle}>Thực phẩm sắp hết hạn</Text>
          </View>
          <Text style={styles.expiryDescription}>
            Rau cải: 1 ngày • Cà chua: 2 ngày
          </Text>
          <Text style={styles.expiryLink}>Xem và ưu tiên sử dụng →</Text>
        </Pressable>

        {/* ADD INGREDIENT */}
        <Text style={styles.sectionTitle}>Thêm nguyên liệu vào kho</Text>

        <View style={styles.quickActions}>
          <Pressable
            style={styles.actionCard}
            onPress={() => comingSoon("Quét nguyên liệu bằng AI")}
          >
            <View style={styles.actionIcon}>
              <Camera size={25} color={C.orange} />
            </View>
            <Text style={styles.actionTitle}>Quét bằng AI</Text>
            <Text style={styles.actionSub}>Chụp ảnh hoặc tải ảnh</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => comingSoon("Nhập nguyên liệu thủ công")}
          >
            <View style={styles.actionIcon}>
              <Plus size={25} color={C.orange} />
            </View>
            <Text style={styles.actionTitle}>Nhập thủ công</Text>
            <Text style={styles.actionSub}>Nhập hoặc chọn danh mục</Text>
          </Pressable>
        </View>

        {/* RECIPE SUGGESTIONS */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Gợi ý món ăn phù hợp</Text>
          <Pressable onPress={() => comingSoon("Tất cả món ăn")}>
            <Text style={styles.sectionLink}>Xem tất cả →</Text>
          </Pressable>
        </View>

        {recipes.map((recipe) => (
          <Pressable
            key={recipe.name}
            style={styles.recipeCard}
            onPress={() => openRecipe(recipe.name)}
          >
            <View style={styles.recipeImage}>
              <Text style={styles.recipeEmoji}>{recipe.emoji}</Text>
            </View>

            <View style={styles.recipeContent}>
              <Text style={styles.recipeTitle}>{recipe.name}</Text>
              <Text style={styles.recipeMatch}>✦ {recipe.match}</Text>
              <Text style={styles.recipeMissing}>{recipe.missing}</Text>
              <Text style={styles.recipeTime}>{recipe.time}</Text>
            </View>

            <ChevronRight size={20} color={C.muted} />
          </Pressable>
        ))}

        {/* TODAY MENU */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Thực đơn hôm nay</Text>
          <Pressable onPress={() => comingSoon("Thực đơn tuần")}>
            <Text style={styles.sectionLink}>Xem tuần →</Text>
          </Pressable>
        </View>

        <View style={styles.menuCard}>
          {[
            ["☀️ Bữa sáng", "Bánh mì trứng"],
            ["🌤️ Bữa trưa", "Cơm + canh bí đỏ"],
            ["🌙 Bữa tối", "Cá hồi áp chảo"],
          ].map((meal, index) => (
            <View
              key={meal[0]}
              style={[styles.mealRow, index < 2 && styles.mealDivider]}
            >
              <Text style={styles.mealLabel}>{meal[0]}</Text>
              <Text style={styles.mealName}>{meal[1]}</Text>
            </View>
          ))}
        </View>

        {/* SHOPPING LIST */}
        <Text style={styles.sectionTitle}>Danh sách mua sắm</Text>

        <Pressable
          style={styles.shoppingCard}
          onPress={() => comingSoon("Danh sách mua sắm")}
        >
          <View style={styles.shoppingIcon}>
            <ShoppingCart size={23} color={C.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shoppingTitle}>3 nguyên liệu cần mua</Text>
            <Text style={styles.shoppingDescription}>
              Chanh · Sữa · Hành lá
            </Text>
          </View>
          <ChevronRight size={20} color={C.orange} />
        </Pressable>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem}>
          <House size={23} color={C.orange} />
          <Text style={styles.navActive}>Trang chủ</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => comingSoon("Khám phá")}
        >
          <Compass size={23} color={C.muted} />
          <Text style={styles.navLabel}>Khám phá</Text>
        </Pressable>

        <Pressable
          style={styles.navCenter}
          onPress={() => comingSoon("Trợ lý AI")}
        >
          <Sparkles size={25} color={C.white} />
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => comingSoon("Tủ đồ")}>
          <Package size={23} color={C.muted} />
          <Text style={styles.navLabel}>Tủ đồ</Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => comingSoon("Cá nhân")}>
          <UserRound size={23} color={C.muted} />
          <Text style={styles.navLabel}>Cá nhân</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 35,
  },
  greeting: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hello: {
    fontSize: 22,
    fontWeight: "800",
    color: C.dark,
  },
  subtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 7,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    height: 52,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
    marginTop: 23,
    marginBottom: 23,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.dark,
  },
  banner: {
    minHeight: 166,
    backgroundColor: C.orange,
    borderRadius: 19,
    padding: 19,
    overflow: "hidden",
  },
  bannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFE0BA",
  },
  bannerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: C.white,
    marginTop: 13,
  },
  bannerDescription: {
    fontSize: 12,
    color: "#FFE4D3",
    marginTop: 6,
    maxWidth: "78%",
  },
  bannerButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: C.white,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerButtonText: {
    fontSize: 12,
    color: C.orange,
    fontWeight: "800",
  },
  bannerEmoji: {
    position: "absolute",
    right: 12,
    bottom: 20,
    fontSize: 64,
  },
  sectionHeading: {
    marginTop: 27,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
  },
  sectionLink: {
    fontSize: 12,
    color: C.orange,
    fontWeight: "700",
  },
  stats: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 27,
    fontWeight: "800",
    color: C.orange,
  },
  statLabel: {
    fontSize: 11,
    color: C.muted,
    marginTop: 7,
    textAlign: "center",
  },
  expiryCard: {
    backgroundColor: "#FFF0DA",
    borderWidth: 1,
    borderColor: "#F4D9AB",
    borderRadius: 14,
    padding: 15,
    marginTop: 15,
    marginBottom: 27,
  },
  expiryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expiryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8F5C15",
  },
  expiryDescription: {
    color: "#8F6B39",
    fontSize: 12,
    marginTop: 9,
  },
  expiryLink: {
    color: "#A36517",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  actionCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    minHeight: 128,
  },
  actionIcon: {
    width: 43,
    height: 43,
    backgroundColor: C.peach,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },
  actionSub: {
    fontSize: 11,
    color: C.muted,
    marginTop: 5,
  },
  recipeCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginBottom: 11,
  },
  recipeImage: {
    width: 83,
    height: 87,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeEmoji: {
    fontSize: 38,
  },
  recipeContent: {
    flex: 1,
    gap: 4,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.dark,
  },
  recipeMatch: {
    fontSize: 11,
    fontWeight: "700",
    color: C.green,
  },
  recipeMissing: {
    fontSize: 11,
    color: C.muted,
  },
  recipeTime: {
    fontSize: 11,
    color: C.muted,
  },
  menuCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    paddingHorizontal: 14,
    marginBottom: 27,
  },
  mealRow: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  mealDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  mealLabel: {
    color: C.muted,
    fontSize: 12,
  },
  mealName: {
    color: C.dark,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  shoppingCard: {
    marginTop: 13,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shoppingIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
  },
  shoppingTitle: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "800",
  },
  shoppingDescription: {
    color: C.muted,
    fontSize: 11,
    marginTop: 6,
  },
  bottomNav: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 5,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  navLabel: {
    color: C.muted,
    fontSize: 10,
  },
  navActive: {
    color: C.orange,
    fontSize: 10,
    fontWeight: "800",
  },
  navCenter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },
});
