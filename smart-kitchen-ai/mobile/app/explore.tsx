// Trang: Khám phá món ăn theo danh mục và tìm kiếm công thức.
import IngredientCatalogResults from "../components/IngredientCatalogResults";
import { matchesSearch } from "../lib/search";
import SearchField from "../components/SearchField";
import { matchesRecipeCategory } from "../lib/recipeCategories";
import FoodImage from "../components/FoodImage";
import { useRecipeFavorites } from "../hooks/useRecipeFavorites";
import { getRecipes, KitchenRecipe } from "../lib/kitchenApi";

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Sparkles,
  ArrowRight,
  Clock3,
  Flame,
  ChefHat,
  ChevronRight,
  Heart,
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

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 52) / 2;

const categories = [
  {
    id: 'vietnam',
    name: 'Món Việt',
    emoji: '🍜',
    description: 'Hương vị quê nhà',
    image:
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=700&q=85',
  },
  {
    id: 'healthy',
    name: 'Ăn lành mạnh',
    emoji: '🥗',
    description: 'Dinh dưỡng cân bằng',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=85',
  },
  {
    id: 'quick',
    name: 'Món nấu nhanh',
    emoji: '⚡',
    description: 'Trong tối đa 30 phút',
    image:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=700&q=85',
  },
  {
    id: 'dessert',
    name: 'Tráng miệng',
    emoji: '🍰',
    description: 'Ngọt ngào mỗi ngày',
    image:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=700&q=85',
  },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(10);
  const [recipes, setRecipes] = useState<(KitchenRecipe & { time: string })[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    setRecipes([]);
    setVisibleCount(10);
    getRecipes().then(rows => {
      if (active) setRecipes(rows.map(r => ({ ...r, time: `${r.minutes} phút` })));
    }).catch(error => { if (active) Alert.alert("Không thể tải công thức", error.message); });
    return () => { active = false; };
  }, []));

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState('all');
  const { favorites, toggleFavorite } = useRecipeFavorites();

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesCategory = matchesRecipeCategory(recipe, selectedCategory);

      const matchesQuery = matchesSearch(search, recipe.name, recipe.description, recipe.category, recipe.region, ...recipe.ingredients.map(item => item.name));
      return matchesCategory && matchesQuery;
    });
  }, [search, selectedCategory, recipes]);


  const openRecipe = (name: string) => {
    router.push({
      pathname: '/recipe-detail',
      params: { name },
    } as any);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setVisibleCount(10);
  };

  const openCategory = (id: string) => {
    setVisibleCount(10);
    setSelectedCategory(current => current === id ? 'all' : id);
    setSearch('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <AppHeader
        showNotification
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* INTRO */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>
            KHÁM PHÁ ẨM THỰC
          </Text>

          <Text style={styles.title}>
            Hôm nay ăn gì ngon? 🍽️
          </Text>

          <Text style={styles.subtitle}>
            Tìm cảm hứng cho bữa ăn ngon mỗi ngày.
          </Text>
        </View>

        {/* SEARCH */}
        <SearchField value={search} onChangeText={changeSearch} placeholder="Tìm món ăn, nguyên liệu yêu thích..." style={styles.searchBox} inputStyle={styles.searchInput} />

        <IngredientCatalogResults query={search} />
        {/* AI FEATURE */}
        <View style={styles.aiCard}>
          <View style={styles.aiBadge}>
            <Sparkles size={15} color="#FFE4CE" />

            <Text style={styles.aiBadgeText}>
              SMART KITCHEN AI
            </Text>
          </View>

          <Text style={styles.aiTitle}>
            Không biết nấu gì?
          </Text>

          <Text style={styles.aiDescription}>
            Để AI gợi ý món ngon từ nguyên liệu
            đang có trong căn bếp của bạn.
          </Text>

          <Pressable
            style={styles.aiButton}
            onPress={() => router.push('/recipes')}
          >
            <Text style={styles.aiButtonText}>
              Khám phá công thức
            </Text>

            <ArrowRight size={17} color={C.orange} />
          </Pressable>

          <Text style={styles.aiEmoji}>🍲</Text>
        </View>

        {/* CATEGORIES */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              Khám phá theo sở thích
            </Text>

            <Text style={styles.sectionSubtitle}>
              Chọn món phù hợp với bạn
            </Text>
          </View>

          <Pressable
            onPress={() => openCategory('all')}
          >
            <Text style={styles.sectionLink}>
              Tất cả →
            </Text>
          </Pressable>
        </View>

        <View style={styles.categoryGrid}>
          {categories.map((item) => {
            const active = selectedCategory === item.id;

            return (
              <Pressable
                key={item.id}
                style={[
                  styles.categoryCard,
                  active && styles.categoryCardActive,
                ]}
                onPress={() => openCategory(item.id)}
              >
                <FoodImage
                  uri={item.image}
                  style={styles.categoryImage}
                />

                <View style={styles.categoryBody}>
                  <Text style={styles.categoryName}>
                    {item.emoji} {item.name}
                  </Text>

                  <Text style={styles.categoryDescription}>
                    {item.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* RECIPES */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              Món ngon dành cho bạn
            </Text>

            <Text style={styles.sectionSubtitle}>
              Sắp xếp theo tên A–Z
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/recipes')}
          >
            <Text style={styles.sectionLink}>
              Xem tất cả →
            </Text>
          </Pressable>
        </View>

        {filteredRecipes.length === 0 ? (
          <View style={styles.emptyCard}>
            <ChefHat size={30} color={C.orange} />

            <Text style={styles.emptyTitle}>
              Chưa tìm thấy món ăn
            </Text>

            <Text style={styles.emptyDescription}>
              {selectedCategory === 'dessert' && !search.trim()
                ? 'Hiện chưa có công thức tráng miệng. Bạn có thể chọn danh mục khác hoặc xem tất cả món.'
                : 'Chưa có món phù hợp. Hãy thử tên món hoặc danh mục khác.'}
            </Text>
          </View>
        ) : (
          <View style={styles.recipeGrid}>
            {filteredRecipes.slice(0, visibleCount).map((recipe) => {
              const isFavorite =
                favorites.includes(recipe.id);

              return (
                <Pressable
                  key={recipe.id}
                  style={styles.recipeCard}
                  onPress={() => openRecipe(recipe.name)}
                >
                  <View style={styles.recipeImageWrap}>
                    <FoodImage
                      uri={recipe.image}
                      style={styles.recipeImage}
                    />

                    <Pressable
                      style={styles.favoriteButton}
                      onPress={() =>
                        toggleFavorite(recipe.id)
                      }
                    >
                      <Heart
                        size={18}
                        color={
                          isFavorite
                            ? '#E44836'
                            : C.orange
                        }
                        fill={
                          isFavorite
                            ? '#E44836'
                            : C.white
                        }
                      />
                    </Pressable>
                  </View>

                  <View style={styles.recipeBody}>
                    <Text
                      style={styles.recipeName}
                      numberOfLines={2}
                    >
                      {recipe.name}
                    </Text>

                    <View style={styles.recipeRating}>
                      <Flame size={15} color={C.orange} />
                      <Text style={styles.ratingText}>
                        {recipe.calories ?? "—"}
                      </Text>
                      <Text style={styles.recipeLevel}>kcal/khẩu phần</Text>
                    </View>

                    <View style={styles.recipeFooter}>
                      <Clock3
                        size={14}
                        color={C.muted}
                      />

                      <Text style={styles.recipeTime}>
                        {recipe.time}
                      </Text>

                      <ChevronRight
                        size={16}
                        color={C.orange}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {filteredRecipes.length > 0 && (
          <View style={styles.loadMoreWrap}>
            <Text style={styles.loadMoreCount}>Đang hiển thị {Math.min(visibleCount, filteredRecipes.length)}/{filteredRecipes.length} món</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: visibleCount >= filteredRecipes.length }}
              disabled={visibleCount >= filteredRecipes.length}
              onPress={() => setVisibleCount(count => Math.min(count + 10, filteredRecipes.length))}
              style={[styles.loadMoreButton, visibleCount >= filteredRecipes.length && styles.loadMoreDisabled]}
            >
              <Text style={styles.loadMoreText}>Xem thêm</Text>
            </Pressable>
            {visibleCount >= filteredRecipes.length && <Text style={styles.loadMoreCount}>Đã hiển thị tất cả món ăn</Text>}
          </View>
        )}

        {/* COMMUNITY */}
        <Pressable
          style={styles.communityCard}
          onPress={() => router.push('/community')}
        >
          <View style={styles.communityIcon}>
            <ChefHat size={24} color={C.orange} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.communityTitle}>
              Cộng đồng ẩm thực 👩‍🍳
            </Text>

            <Text style={styles.communityDescription}>
              Chia sẻ món ngon và bí quyết nấu ăn
              cùng mọi người.
            </Text>
          </View>

          <ChevronRight size={20} color={C.orange} />
        </Pressable>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadMoreWrap: { alignItems: 'center', gap: 10, marginTop: 20 },
  loadMoreCount: { fontSize: 12, color: C.muted },
  loadMoreButton: { width: '100%', minHeight: 46, borderRadius: 13, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  loadMoreDisabled: { opacity: 0.35 },
  loadMoreText: { color: C.white, fontSize: 14, fontWeight: '700' },
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 23,
    paddingBottom: 35,
  },

  intro: {
    marginBottom: 20,
  },

  eyebrow: {
    color: C.orange,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: C.dark,
    marginTop: 8,
  },

  subtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 8,
  },

  searchBox: {
    height: 52,
    borderRadius: 15,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 21,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.dark,
  },

  aiCard: {
    backgroundColor: C.orange,
    borderRadius: 20,
    padding: 19,
    minHeight: 185,
    overflow: 'hidden',
  },

  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFE4CE',
  },

  aiTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.white,
    marginTop: 14,
  },

  aiDescription: {
    fontSize: 12,
    color: '#FFE4CE',
    lineHeight: 19,
    marginTop: 7,
    maxWidth: '76%',
  },

  aiButton: {
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 15,
  },

  aiButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.orange,
  },

  aiEmoji: {
    position: 'absolute',
    right: 12,
    bottom: 26,
    fontSize: 60,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 15,
    gap: 8,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.dark,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 5,
  },

  sectionLink: {
    fontSize: 12,
    fontWeight: '800',
    color: C.orange,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  categoryCard: {
    width: cardWidth,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },

  categoryCardActive: {
    borderColor: C.orange,
    borderWidth: 2,
  },

  categoryImage: {
    width: '100%',
    height: 105,
    backgroundColor: C.peach,
  },

  categoryBody: {
    padding: 11,
  },

  categoryName: {
    fontSize: 12,
    fontWeight: '800',
    color: C.dark,
  },

  categoryDescription: {
    fontSize: 10,
    color: C.muted,
    marginTop: 5,
  },

  recipeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  recipeCard: {
    width: cardWidth,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },

  recipeImageWrap: {
    position: 'relative',
  },

  recipeImage: {
    width: '100%',
    height: 135,
    backgroundColor: C.peach,
  },

  favoriteButton: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recipeBody: {
    padding: 12,
  },

  recipeName: {
    fontSize: 13,
    fontWeight: '800',
    color: C.dark,
    minHeight: 34,
  },

  recipeRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },

  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.dark,
  },

  recipeLevel: {
    fontSize: 10,
    color: C.muted,
  },

  recipeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    marginTop: 12,
  },

  recipeTime: {
    flex: 1,
    fontSize: 11,
    color: C.muted,
  },

  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 28,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.dark,
  },

  emptyDescription: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
  },

  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    marginTop: 29,
  },

  communityIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },

  communityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.dark,
  },

  communityDescription: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 17,
    marginTop: 5,
  },
});
