
import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Keyboard,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  Search,
  Sparkles,
  Camera,
  Plus,
  ShoppingCart,
  ArrowRight,
  ChevronRight,
  TriangleAlert,
  UsersRound,
  MessageCircle,
} from 'lucide-react-native';

import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';

const C = {
  orange: '#A23A00',
  cream: '#FFF8F6',
  peach: '#FEF1EB',
  dark: '#201A17',
  muted: '#735A51',
  border: '#EED9CF',
  white: '#FFFFFF',
  green: '#39845A',
};

const recipes = [
  {
    emoji: '🍣',
    name: 'Cá hồi áp chảo',
    match: '92% phù hợp',
    missing: 'Thiếu: 1 quả chanh',
    time: '20 phút · Dễ nấu',
  },
  {
    emoji: '🥣',
    name: 'Canh bí đỏ',
    match: '88% phù hợp',
    missing: 'Đủ nguyên liệu',
    time: '25 phút · Dễ nấu',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const goTo = (path: string) => {
    Keyboard.dismiss();
    router.push(path as any);
  };

  const openRecipe = (name: string) => {
    router.push({
      pathname: '/recipe-detail',
      params: { name },
    } as any);
  };

  const searchRecipes = () => {
    Keyboard.dismiss();

    router.push({
      pathname: '/recipes',
      params: {
        search: search.trim(),
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <AppHeader
        showNotification
        unreadCount={3}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* LỜI CHÀO */}
        <View style={styles.greeting}>
          <View>
            <Text style={styles.hello}>
              Chào buổi sáng 👋
            </Text>

            <Text style={styles.subtitle}>
              Hôm nay mình cùng nấu món ngon nhé!
            </Text>
          </View>
        </View>

        {/* TÌM KIẾM */}
        <View style={styles.searchBox}>
          <Search size={20} color={C.muted} />

          <TextInput
            style={styles.searchInput}
            placeholder="Tìm món ăn, công thức, nguyên liệu..."
            placeholderTextColor="#A18B81"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={searchRecipes}
          />

          {search.trim().length > 0 && (
            <Pressable onPress={searchRecipes}>
              <ArrowRight
                size={20}
                color={C.orange}
              />
            </Pressable>
          )}
        </View>

        {/* BANNER AI */}
        <View style={styles.banner}>
          <View style={styles.bannerBadge}>
            <Sparkles size={15} color="#FFE0BA" />

            <Text style={styles.bannerBadgeText}>
              SMART KITCHEN AI
            </Text>
          </View>

          <Text style={styles.bannerTitle}>
            Hôm nay ăn gì?
          </Text>

          <Text style={styles.bannerDescription}>
            Gợi ý món từ thực phẩm bạn đang có
          </Text>

          <Pressable
            style={styles.bannerButton}
            onPress={() => goTo('/recipes')}
          >
            <Text style={styles.bannerButtonText}>
              Khám phá món ăn
            </Text>

            <ArrowRight
              size={16}
              color={C.orange}
            />
          </Pressable>

          <Text style={styles.bannerEmoji}>
            🍲
          </Text>
        </View>

        {/* KHO THỰC PHẨM */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            Kho thực phẩm của bạn
          </Text>

          <Pressable onPress={() => goTo('/pantry')}>
            <Text style={styles.sectionLink}>
              Xem kho →
            </Text>
          </Pressable>
        </View>

        <View style={styles.stats}>
          <Pressable
            style={styles.statCard}
            onPress={() => goTo('/pantry')}
          >
            <Text style={styles.statNumber}>
              12
            </Text>

            <Text style={styles.statLabel}>
              Nguyên liệu
            </Text>
          </Pressable>

          <Pressable
            style={styles.statCard}
            onPress={() => goTo('/pantry')}
          >
            <Text
              style={[
                styles.statNumber,
                { color: '#C17B22' },
              ]}
            >
              03
            </Text>

            <Text style={styles.statLabel}>
              Sắp hết hạn
            </Text>
          </Pressable>

          <Pressable
            style={styles.statCard}
            onPress={() => goTo('/shopping-list')}
          >
            <Text style={styles.statNumber}>
              02
            </Text>

            <Text style={styles.statLabel}>
              Cần bổ sung
            </Text>
          </Pressable>
        </View>

        {/* CẢNH BÁO HẾT HẠN */}
        <Pressable
          style={styles.expiryCard}
          onPress={() => goTo('/pantry')}
        >
          <View style={styles.expiryHeader}>
            <TriangleAlert
              size={19}
              color="#B87418"
            />

            <Text style={styles.expiryTitle}>
              Thực phẩm sắp hết hạn
            </Text>
          </View>

          <Text style={styles.expiryDescription}>
            Rau cải: 1 ngày • Cà chua: 2 ngày
          </Text>

          <Text style={styles.expiryLink}>
            Xem và ưu tiên sử dụng →
          </Text>
        </Pressable>

        {/* THÊM NGUYÊN LIỆU */}
        <Text style={styles.sectionTitle}>
          Thêm nguyên liệu vào kho
        </Text>

        <View style={styles.quickActions}>
          <Pressable
            style={styles.actionCard}
            onPress={() => goTo('/scan')}
          >
            <View style={styles.actionIcon}>
              <Camera
                size={25}
                color={C.orange}
              />
            </View>

            <Text style={styles.actionTitle}>
              Quét bằng AI
            </Text>

            <Text style={styles.actionSub}>
              Chụp ảnh hoặc tải ảnh
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() => goTo('/add-ingredient')}
          >
            <View style={styles.actionIcon}>
              <Plus
                size={25}
                color={C.orange}
              />
            </View>

            <Text style={styles.actionTitle}>
              Nhập thủ công
            </Text>

            <Text style={styles.actionSub}>
              Nhập hoặc chọn danh mục
            </Text>
          </Pressable>
        </View>

        {/* GỢI Ý MÓN ĂN */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            Gợi ý món ăn phù hợp
          </Text>

          <Pressable
            onPress={() => goTo('/recipes')}
          >
            <Text style={styles.sectionLink}>
              Xem tất cả →
            </Text>
          </Pressable>
        </View>

        {recipes.map((recipe) => (
          <Pressable
            key={recipe.name}
            style={styles.recipeCard}
            onPress={() => openRecipe(recipe.name)}
          >
            <View style={styles.recipeImage}>
              <Text style={styles.recipeEmoji}>
                {recipe.emoji}
              </Text>
            </View>

            <View style={styles.recipeContent}>
              <Text style={styles.recipeTitle}>
                {recipe.name}
              </Text>

              <Text style={styles.recipeMatch}>
                ✦ {recipe.match}
              </Text>

              <Text style={styles.recipeMissing}>
                {recipe.missing}
              </Text>

              <Text style={styles.recipeTime}>
                {recipe.time}
              </Text>
            </View>

            <ChevronRight
              size={20}
              color={C.muted}
            />
          </Pressable>
        ))}

        {/* CỘNG ĐỒNG ẨM THỰC */}
        <View style={styles.communitySection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Cộng đồng ẩm thực
            </Text>

            <Pressable onPress={() => goTo('/community')}>
              <Text style={styles.sectionLink}>
                Xem tất cả →
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.communityCard}
            onPress={() => goTo('/community')}
          >
            <View style={styles.communityTop}>
              <View style={styles.communityIcon}>
                <UsersRound size={25} color={C.orange} />
              </View>

              <View style={styles.communityInfo}>
                <Text style={styles.communityBadge}>
                  GÓC CHIA SẺ MÓN NGON
                </Text>

                <Text style={styles.communityTitle}>
                  Hôm nay bạn nấu món gì? 🍳
                </Text>
              </View>
            </View>

            <Text style={styles.communityDescription}>
              Chia sẻ công thức, khám phá món ngon và
              kết nối với những người có cùng đam mê nấu ăn.
            </Text>

            <View style={styles.communityFooter}>
              <View style={styles.communityMembers}>
                <MessageCircle size={16} color={C.muted} />

                <Text style={styles.communityMembersText}>
                  Cùng chia sẻ bí quyết vào bếp
                </Text>
              </View>

              <View style={styles.communityArrow}>
                <ArrowRight size={18} color={C.white} />
              </View>
            </View>
          </Pressable>
        </View>

        {/* THỰC ĐƠN HÔM NAY */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>
            Thực đơn hôm nay
          </Text>

          <Pressable
            onPress={() => goTo('/meal-plan')}
          >
            <Text style={styles.sectionLink}>
              Xem tuần →
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.menuCard}
          onPress={() => goTo('/meal-plan')}
        >
          {[
            ['☀️ Bữa sáng', 'Bánh mì trứng'],
            ['🌤️ Bữa trưa', 'Cơm + canh bí đỏ'],
            ['🌙 Bữa tối', 'Cá hồi áp chảo'],
          ].map((meal, index) => (
            <View
              key={meal[0]}
              style={[
                styles.mealRow,
                index < 2 && styles.mealDivider,
              ]}
            >
              <Text style={styles.mealLabel}>
                {meal[0]}
              </Text>

              <Text style={styles.mealName}>
                {meal[1]}
              </Text>
            </View>
          ))}
        </Pressable>

        {/* DANH SÁCH MUA SẮM */}
        <Text style={styles.sectionTitle}>
          Danh sách mua sắm
        </Text>

        <Pressable
          style={styles.shoppingCard}
          onPress={() => goTo('/shopping-list')}
        >
          <View style={styles.shoppingIcon}>
            <ShoppingCart
              size={23}
              color={C.orange}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.shoppingTitle}>
              3 nguyên liệu cần mua
            </Text>

            <Text style={styles.shoppingDescription}>
              Chanh · Sữa · Hành lá
            </Text>
          </View>

          <ChevronRight
            size={20}
            color={C.orange}
          />
        </Pressable>
      </ScrollView>

      <BottomNav />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  hello: {
    fontSize: 22,
    fontWeight: '800',
    color: C.dark,
  },

  subtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 7,
  },

  searchBox: {
    height: 52,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
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
    overflow: 'hidden',
  },

  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  bannerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFE0BA',
  },

  bannerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: C.white,
    marginTop: 13,
  },

  bannerDescription: {
    fontSize: 12,
    color: '#FFE4D3',
    marginTop: 6,
    maxWidth: '78%',
  },

  bannerButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: C.white,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  bannerButtonText: {
    fontSize: 12,
    color: C.orange,
    fontWeight: '800',
  },

  bannerEmoji: {
    position: 'absolute',
    right: 12,
    bottom: 20,
    fontSize: 64,
  },

  sectionHeading: {
    marginTop: 27,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.dark,
    flexShrink: 1,
  },

  sectionLink: {
    fontSize: 12,
    color: C.orange,
    fontWeight: '700',
  },

  stats: {
    flexDirection: 'row',
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 27,
    fontWeight: '800',
    color: C.orange,
  },

  statLabel: {
    fontSize: 11,
    color: C.muted,
    marginTop: 7,
    textAlign: 'center',
  },

  expiryCard: {
    backgroundColor: '#FFF0DA',
    borderWidth: 1,
    borderColor: '#F4D9AB',
    borderRadius: 14,
    padding: 15,
    marginTop: 15,
    marginBottom: 27,
  },

  expiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  expiryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8F5C15',
  },

  expiryDescription: {
    color: '#8F6B39',
    fontSize: 12,
    marginTop: 9,
  },

  expiryLink: {
    color: '#A36517',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },

  quickActions: {
    flexDirection: 'row',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  actionTitle: {
    fontSize: 13,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 11,
  },

  recipeImage: {
    width: 83,
    height: 87,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '800',
    color: C.dark,
  },

  recipeMatch: {
    fontSize: 11,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },

  shoppingCard: {
    marginTop: 13,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  shoppingIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: C.peach,
    justifyContent: 'center',
    alignItems: 'center',
  },

  shoppingTitle: {
    color: C.dark,
    fontSize: 13,
    fontWeight: '800',
  },

  shoppingDescription: {
    color: C.muted,
    fontSize: 11,
    marginTop: 6,
  },

  communitySection: {
    marginTop: 8,
    marginBottom: 4,
  },

  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EED9CF',
    padding: 17,
    overflow: 'hidden',
  },

  communityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  communityIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FEF1EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  communityInfo: {
    flex: 1,
    gap: 7,
  },

  communityBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A23A00',
    letterSpacing: 0.6,
  },

  communityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#201A17',
  },

  communityDescription: {
    fontSize: 12,
    color: '#735A51',
    lineHeight: 19,
    marginTop: 14,
  },

  communityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#F4E7E1',
  },

  communityMembers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },

  communityMembersText: {
    fontSize: 11,
    color: '#735A51',
  },

  communityArrow: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#A23A00',
    alignItems: 'center',
    justifyContent: 'center',
  },

});
