
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Clock3,
  ChefHat,
  Sparkles,
  Leaf,
  CheckCircle2,
  ShoppingBasket,
  X,
  RefreshCw,
  ChevronRight,
} from 'lucide-react-native';

import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';

const C = {
  orange: '#A23A00',
  cream: '#FFF8F6',
  peach: '#FEF1EB',
  white: '#FFFFFF',
  dark: '#201A17',
  muted: '#735A51',
  border: '#EED9CF',
  green: '#39845A',
};

type Filter = 'enough' | 'quick' | 'healthy';

type Recipe = {
  id: string;
  emoji: string;
  name: string;
  time: number;
  description: string;
  ingredients: string[];
  missing: string[];
  healthy: boolean;
  priority: boolean;
  instructions: string[];
};

const recipes: Recipe[] = [
  {
    id: '1',
    emoji: '🍲',
    name: 'Canh cải nấu trứng',
    time: 20,
    description: 'Đủ nguyên liệu · Dễ làm',
    ingredients: ['Cải xanh', 'Trứng gà'],
    missing: [],
    healthy: true,
    priority: true,
    instructions: [
      'Rửa sạch cải xanh và cắt vừa ăn.',
      'Đun sôi nước, cho cải vào nấu chín.',
      'Đánh tan trứng và đổ từ từ vào nồi.',
      'Nêm gia vị vừa ăn rồi tắt bếp.',
    ],
  },
  {
    id: '2',
    emoji: '🍳',
    name: 'Trứng sốt cà chua',
    time: 15,
    description: 'Dùng cà chua sắp hết hạn',
    ingredients: ['Trứng gà', 'Cà chua'],
    missing: [],
    healthy: true,
    priority: false,
    instructions: [
      'Rửa sạch cà chua và cắt nhỏ.',
      'Đánh trứng, chiên sơ rồi cho ra đĩa.',
      'Xào cà chua đến khi mềm và tạo sốt.',
      'Cho trứng vào đảo đều, nêm gia vị.',
    ],
  },
  {
    id: '3',
    emoji: '🍚',
    name: 'Cơm chiên rau củ',
    time: 25,
    description: 'Cần mua thêm hành lá',
    ingredients: ['Trứng gà', 'Cà chua', 'Cơm'],
    missing: ['Hành lá'],
    healthy: false,
    priority: false,
    instructions: [
      'Chuẩn bị cơm nguội và rau củ.',
      'Đánh trứng, cho vào chảo đảo đều.',
      'Thêm cơm và rau củ, đảo đến khi nóng.',
      'Nêm gia vị và thêm hành lá nếu có.',
    ],
  },
];

const filters: { key: Filter; label: string }[] = [
  { key: 'enough', label: 'Đủ nguyên liệu' },
  { key: 'quick', label: 'Nấu nhanh' },
  { key: 'healthy', label: 'Ăn lành mạnh' },
];

export default function RecipesScreen() {
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('enough');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [showAll, setShowAll] = useState(true);

  const displayedRecipes = useMemo(() => {
    let result = [...recipes];

    if (filter === 'enough' && !showAll) {
      result = result.filter((r) => r.missing.length === 0);
    }

    if (filter === 'quick') {
      result = result.filter((r) => r.time <= 20);
    }

    if (filter === 'healthy') {
      result = result.filter((r) => r.healthy);
    }

    return result;
  }, [filter, showAll]);

  const chooseFilter = (value: Filter) => {
    setFilter(value);
    setShowAll(false);
  };

  const showMore = () => {
    setFilter('enough');
    setShowAll(true);

    Alert.alert(
      'Gợi ý món ăn',
      'Đã hiển thị toàn bộ món ăn mẫu. Khi kết nối AI, hệ thống sẽ gợi ý thêm dựa trên nguyên liệu trong kho.'
    );
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={[]}>
      <AppHeader showNotification unreadCount={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TIÊU ĐỀ */}
        <View style={styles.heading}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={23} color={C.orange} />
          </Pressable>

          <Text style={styles.title}>
            Gợi ý món ăn
          </Text>
        </View>

        <Text style={styles.subtitle}>
          Món ngon phù hợp nguyên liệu đang có
        </Text>

        {/* BỘ LỌC */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((item) => {
            const active = filter === item.key;

            return (
              <Pressable
                key={item.key}
                style={[
                  styles.filterButton,
                  active && styles.filterActive,
                ]}
                onPress={() => chooseFilter(item.key)}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* DANH SÁCH MÓN ĂN */}
        <View style={styles.recipeList}>
          {displayedRecipes.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={[
                styles.recipeCard,
                recipe.priority && styles.priorityCard,
              ]}
              onPress={() => setSelected(recipe)}
            >
              {recipe.priority ? (
                <>
                  <View style={styles.featuredImage}>
                    <Text style={styles.featuredEmoji}>
                      {recipe.emoji}
                    </Text>

                    <View style={styles.priorityBadge}>
                      <Sparkles
                        size={13}
                        color={C.orange}
                      />
                      <Text style={styles.priorityText}>
                        ƯU TIÊN DÙNG TRƯỚC
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featuredInfo}>
                    <Text style={styles.recipeName}>
                      {recipe.name}
                    </Text>

                    <View style={styles.metaRow}>
                      <Clock3 size={14} color={C.muted} />
                      <Text style={styles.recipeMeta}>
                        {recipe.time} phút · {recipe.description}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.compactRow}>
                  <View style={styles.emojiBox}>
                    <Text style={styles.emoji}>
                      {recipe.emoji}
                    </Text>
                  </View>

                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>
                      {recipe.name}
                    </Text>

                    <Text style={styles.recipeMeta}>
                      {recipe.time} phút · {recipe.description}
                    </Text>
                  </View>

                  <ChevronRight
                    size={18}
                    color={C.muted}
                  />
                </View>
              )}
            </Pressable>
          ))}

          {displayedRecipes.length === 0 && (
            <View style={styles.empty}>
              <ChefHat size={30} color={C.muted} />
              <Text style={styles.emptyText}>
                Chưa có món ăn phù hợp
              </Text>
            </View>
          )}
        </View>

        {/* GỢI Ý THÊM */}
        <Pressable
          style={styles.moreButton}
          onPress={showMore}
        >
          <Sparkles size={19} color={C.orange} />
          <Text style={styles.moreText}>
            Gợi ý thêm món ăn
          </Text>
          <RefreshCw size={17} color={C.orange} />
        </Pressable>
      </ScrollView>

      <BottomNav />

      {/* CHI TIẾT MÓN ĂN */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Chi tiết món ăn
              </Text>

              <Pressable onPress={() => setSelected(null)}>
                <X size={23} color={C.muted} />
              </Pressable>
            </View>

            {selected && (
              <ScrollView
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalEmoji}>
                  {selected.emoji}
                </Text>

                <Text style={styles.modalRecipeName}>
                  {selected.name}
                </Text>

                <View style={styles.modalMeta}>
                  <Clock3 size={16} color={C.orange} />
                  <Text style={styles.modalMetaText}>
                    {selected.time} phút
                  </Text>

                  {selected.healthy && (
                    <>
                      <Leaf size={16} color={C.green} />
                      <Text style={styles.modalMetaText}>
                        Lành mạnh
                      </Text>
                    </>
                  )}
                </View>

                <Text style={styles.modalSection}>
                  Nguyên liệu
                </Text>

                {selected.ingredients.map((name) => (
                  <View key={name} style={styles.detailRow}>
                    <CheckCircle2
                      size={17}
                      color={C.green}
                    />
                    <Text style={styles.detailText}>
                      {name}
                    </Text>
                  </View>
                ))}

                {selected.missing.length > 0 && (
                  <>
                    <Text style={styles.modalSection}>
                      Cần mua thêm
                    </Text>

                    {selected.missing.map((name) => (
                      <View key={name} style={styles.detailRow}>
                        <ShoppingBasket
                          size={17}
                          color={C.orange}
                        />
                        <Text style={styles.detailText}>
                          {name}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                <Text style={styles.modalSection}>
                  Cách thực hiện
                </Text>

                {selected.instructions.map((step, i) => (
                  <Text
                    key={i}
                    style={styles.instruction}
                  >
                    {i + 1}. {step}
                  </Text>
                ))}

                <Pressable
                  style={styles.closeButton}
                  onPress={() => setSelected(null)}
                >
                  <Text style={styles.closeText}>
                    Đóng
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 25,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 24,
    height: 38,
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: C.dark,
  },
  subtitle: {
    marginTop: 9,
    fontSize: 12,
    color: C.muted,
  },
  filterScroll: {
    marginTop: 25,
    flexGrow: 0,
  },
  filterRow: {
    gap: 9,
    paddingRight: 10,
  },
  filterButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  filterActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  filterTextActive: {
    color: C.white,
    fontWeight: '800',
  },
  recipeList: {
    gap: 14,
    marginTop: 23,
  },
  recipeCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    overflow: 'hidden',
  },
  priorityCard: {
    borderRadius: 17,
  },
  featuredImage: {
    height: 143,
    backgroundColor: '#F9E4D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredEmoji: {
    fontSize: 76,
  },
  priorityBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.white,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  priorityText: {
    fontSize: 10,
    color: C.orange,
    fontWeight: '800',
  },
  featuredInfo: {
    padding: 16,
  },
  recipeName: {
    fontSize: 15,
    fontWeight: '800',
    color: C.dark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
  },
  recipeMeta: {
    fontSize: 11,
    color: C.muted,
    marginTop: 7,
    flexShrink: 1,
  },
  compactRow: {
    minHeight: 90,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emojiBox: {
    width: 58,
    height: 58,
    borderRadius: 13,
    backgroundColor: C.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 30,
  },
  recipeInfo: {
    flex: 1,
  },
  moreButton: {
    height: 52,
    marginTop: 23,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  moreText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.orange,
  },
  empty: {
    paddingVertical: 35,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: C.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.dark,
  },
  modalEmoji: {
    textAlign: 'center',
    fontSize: 65,
    marginVertical: 10,
  },
  modalRecipeName: {
    fontSize: 21,
    fontWeight: '800',
    color: C.dark,
    textAlign: 'center',
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  modalMetaText: {
    fontSize: 12,
    color: C.muted,
  },
  modalSection: {
    marginTop: 23,
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '800',
    color: C.dark,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 13,
    color: C.muted,
  },
  instruction: {
    fontSize: 13,
    lineHeight: 21,
    color: C.muted,
    marginBottom: 9,
  },
  closeButton: {
    height: 48,
    backgroundColor: C.orange,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  closeText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
