
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  PackagePlus,
  Leaf,
  Beef,
  Milk,
  Wheat,
  Snowflake,
  Refrigerator,
  House,
  CalendarDays,
  StickyNote,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Save,
  X,
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
  green: '#397C57',
  greenLight: '#E9F5EB',
};

type Category =
  | 'Rau củ'
  | 'Thịt cá'
  | 'Sữa & trứng'
  | 'Ngũ cốc'
  | 'Khác';

type StorageLocation =
  | 'Ngăn mát'
  | 'Ngăn đông'
  | 'Bên ngoài';

type Ingredient = {
  id: string;
  name: string;
  category: Category;
  quantity: string;
  unit: string;
  location: StorageLocation;
  purchaseDate: string;
  expiryDate: string;
  note: string;
  createdAt: string;
};

const STORAGE_KEY = 'smart-kitchen-manual-ingredients-v1';

const CATEGORIES: {
  name: Category;
  icon: typeof Leaf;
}[] = [
  { name: 'Rau củ', icon: Leaf },
  { name: 'Thịt cá', icon: Beef },
  { name: 'Sữa & trứng', icon: Milk },
  { name: 'Ngũ cốc', icon: Wheat },
  { name: 'Khác', icon: PackagePlus },
];

const LOCATIONS: {
  name: StorageLocation;
  icon: typeof Refrigerator;
}[] = [
  { name: 'Ngăn mát', icon: Refrigerator },
  { name: 'Ngăn đông', icon: Snowflake },
  { name: 'Bên ngoài', icon: House },
];

const UNITS = ['g', 'kg', 'ml', 'lít', 'quả', 'củ', 'hộp', 'gói'];

function todayString() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export default function AddIngredientScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Rau củ');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [showUnits, setShowUnits] = useState(false);

  const [location, setLocation] =
    useState<StorageLocation>('Ngăn mát');

  const [purchaseDate, setPurchaseDate] = useState(todayString());
  const [expiryDate, setExpiryDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const goBack = () => {
    Keyboard.dismiss();

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/pantry' as any);
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('Rau củ');
    setQuantity('');
    setUnit('g');
    setLocation('Ngăn mát');
    setPurchaseDate(todayString());
    setExpiryDate('');
    setNote('');
    setShowUnits(false);
  };

  const saveIngredient = async () => {
    Keyboard.dismiss();

    if (!name.trim()) {
      Alert.alert('Thiếu tên nguyên liệu', 'Vui lòng nhập tên nguyên liệu.');
      return;
    }

    const amount = Number(quantity.replace(',', '.'));

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert(
        'Số lượng không hợp lệ',
        'Vui lòng nhập số lượng lớn hơn 0.'
      );
      return;
    }

    const purchased = parseDate(purchaseDate.trim());

    if (!purchased) {
      Alert.alert(
        'Ngày mua không hợp lệ',
        'Vui lòng nhập ngày mua theo dạng YYYY-MM-DD.'
      );
      return;
    }

    const expiry = parseDate(expiryDate.trim());

    if (!expiry) {
      Alert.alert(
        'Hạn sử dụng không hợp lệ',
        'Vui lòng nhập hạn sử dụng theo dạng YYYY-MM-DD.'
      );
      return;
    }

    if (expiry.getTime() < purchased.getTime()) {
      Alert.alert(
        'Kiểm tra ngày',
        'Hạn sử dụng không được trước ngày mua.'
      );
      return;
    }

    const ingredient: Ingredient = {
      id: `${Date.now()}-${Math.random()}`,
      name: name.trim(),
      category,
      quantity: String(amount),
      unit,
      location,
      purchaseDate: purchaseDate.trim(),
      expiryDate: expiryDate.trim(),
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    setSaving(true);

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      const existing: Ingredient[] = Array.isArray(parsed) ? parsed : [];

      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([ingredient, ...existing])
      );

      Alert.alert(
        'Đã lưu nguyên liệu',
        `"${ingredient.name}" đã được lưu trên thiết bị.`,
        [
          {
            text: 'Thêm tiếp',
            onPress: resetForm,
          },
          {
            text: 'Về kho thực phẩm',
            onPress: () => router.replace('/pantry' as any),
          },
        ]
      );
    } catch {
      Alert.alert(
        'Không thể lưu',
        'Đã xảy ra lỗi khi lưu nguyên liệu. Vui lòng thử lại.'
      );
    } finally {
      setSaving(false);
    }
  };

  const SectionTitle = ({
    number,
    title,
    subtitle,
  }: {
    number: string;
    title: string;
    subtitle?: string;
  }) => (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={styles.screen}
      edges={['left', 'right']}
    >
      <AppHeader />

      {/* TIÊU ĐỀ */}
      <View style={styles.pageHeader}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <ArrowLeft size={21} color={C.orange} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            Thêm nguyên liệu
          </Text>
          <Text style={styles.headerSubtitle}>
            Cập nhật kho thực phẩm của bạn
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <PackagePlus size={21} color={C.orange} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* INTRO */}
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Text style={{ fontSize: 27 }}>🥑</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.introTitle}>
                Thêm thực phẩm vào bếp
              </Text>
              <Text style={styles.introText}>
                Lưu thông tin để quản lý nguyên liệu và theo dõi hạn sử dụng.
              </Text>
            </View>
          </View>

          {/* PHẦN 1 */}
          <View style={styles.formCard}>
            <SectionTitle
              number="01"
              title="Thông tin nguyên liệu"
              subtitle="Nhập tên và chọn nhóm thực phẩm"
            />

            <Text style={styles.label}>
              Tên nguyên liệu <Text style={styles.required}>*</Text>
            </Text>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Ví dụ: Cà chua, thịt bò, trứng gà..."
                placeholderTextColor="#A18B81"
                maxLength={80}
              />

              {name.length > 0 && (
                <Pressable onPress={() => setName('')}>
                  <X size={17} color={C.muted} />
                </Pressable>
              )}
            </View>

            <Text style={styles.label}>Nhóm thực phẩm</Text>

            <View style={styles.categoryGrid}>
              {CATEGORIES.map((item) => {
                const Icon = item.icon;
                const active = category === item.name;

                return (
                  <Pressable
                    key={item.name}
                    onPress={() => setCategory(item.name)}
                    style={[
                      styles.categoryChip,
                      active && styles.categoryChipActive,
                    ]}
                  >
                    <Icon
                      size={16}
                      color={active ? C.white : C.orange}
                    />

                    <Text
                      style={[
                        styles.categoryText,
                        active && styles.categoryTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* PHẦN 2 */}
          <View style={styles.formCard}>
            <SectionTitle
              number="02"
              title="Số lượng & bảo quản"
              subtitle="Giúp quản lý thực phẩm chính xác hơn"
            />

            <Text style={styles.label}>
              Số lượng <Text style={styles.required}>*</Text>
            </Text>

            <View style={styles.quantityRow}>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <TextInput
                  style={styles.textInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Ví dụ: 500"
                  placeholderTextColor="#A18B81"
                  keyboardType="decimal-pad"
                />
              </View>

              <Pressable
                style={styles.unitButton}
                onPress={() => setShowUnits((v) => !v)}
              >
                <Text style={styles.unitText}>{unit}</Text>
                <ChevronDown size={15} color={C.orange} />
              </Pressable>
            </View>

            {showUnits && (
              <View style={styles.unitOptions}>
                {UNITS.map((value) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.unitOption,
                      unit === value && styles.unitOptionActive,
                    ]}
                    onPress={() => {
                      setUnit(value);
                      setShowUnits(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.unitOptionText,
                        unit === value && {
                          color: C.white,
                        },
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.label}>Vị trí bảo quản</Text>

            <View style={styles.locationRow}>
              {LOCATIONS.map((item) => {
                const Icon = item.icon;
                const active = location === item.name;

                return (
                  <Pressable
                    key={item.name}
                    style={[
                      styles.locationCard,
                      active && styles.locationCardActive,
                    ]}
                    onPress={() => setLocation(item.name)}
                  >
                    <Icon
                      size={23}
                      color={active ? C.orange : C.muted}
                    />

                    <Text
                      style={[
                        styles.locationText,
                        active && { color: C.orange },
                      ]}
                    >
                      {item.name}
                    </Text>

                    {active && (
                      <CheckCircle2
                        size={14}
                        color={C.orange}
                        style={styles.selectedCheck}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* PHẦN 3 */}
          <View style={styles.formCard}>
            <SectionTitle
              number="03"
              title="Ngày mua & hạn sử dụng"
              subtitle="Theo dõi độ tươi của thực phẩm"
            />

            <Text style={styles.label}>
              Ngày mua <Text style={styles.required}>*</Text>
            </Text>

            <View style={styles.inputWrapper}>
              <CalendarDays size={19} color={C.orange} />
              <TextInput
                style={styles.textInput}
                value={purchaseDate}
                onChangeText={setPurchaseDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A18B81"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>

            <Text style={styles.label}>
              Hạn sử dụng <Text style={styles.required}>*</Text>
            </Text>

            <View style={styles.inputWrapper}>
              <CalendarDays size={19} color={C.orange} />
              <TextInput
                style={styles.textInput}
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#A18B81"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>

            <View style={styles.dateTip}>
              <Sparkles size={16} color={C.green} />
              <Text style={styles.dateTipText}>
                Nhập đúng hạn sử dụng trên bao bì để nhận cảnh báo kịp thời.
              </Text>
            </View>
          </View>

          {/* PHẦN 4 */}
          <View style={styles.formCard}>
            <SectionTitle
              number="04"
              title="Ghi chú"
              subtitle="Không bắt buộc"
            />

            <View style={styles.noteInputWrapper}>
              <StickyNote size={19} color={C.orange} />
              <TextInput
                style={styles.noteInput}
                multiline
                textAlignVertical="top"
                value={note}
                onChangeText={setNote}
                placeholder="Ví dụ: Đã mở hộp, cần dùng sớm, mua ở siêu thị..."
                placeholderTextColor="#A18B81"
                maxLength={300}
              />
            </View>

            <Text style={styles.characterCount}>
              {note.length}/300
            </Text>
          </View>

          {/* XEM TRƯỚC */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.previewIcon}>
                <PackagePlus size={19} color={C.orange} />
              </View>

              <Text style={styles.previewTitle}>
                Xem trước nguyên liệu
              </Text>
            </View>

            <Text style={styles.previewName}>
              {name.trim() || 'Tên nguyên liệu'}
            </Text>

            <View style={styles.previewChips}>
              <View style={styles.previewChip}>
                <Text style={styles.previewChipText}>
                  {category}
                </Text>
              </View>

              <View style={styles.previewChip}>
                <Text style={styles.previewChipText}>
                  {quantity.trim() || '0'} {unit}
                </Text>
              </View>

              <View style={styles.previewChip}>
                <Text style={styles.previewChipText}>
                  {location}
                </Text>
              </View>
            </View>

            <Text style={styles.previewExpiry}>
              Hạn sử dụng: {expiryDate.trim() || 'Chưa nhập'}
            </Text>
          </View>

          <View style={styles.footerTip}>
            <Leaf size={18} color={C.green} />
            <Text style={styles.footerTipText}>
              Quản lý thực phẩm tốt hơn giúp bạn tiết kiệm chi phí và giảm lãng phí.
            </Text>
          </View>
        </ScrollView>

        {/* THANH LƯU CỐ ĐỊNH */}
        <View style={styles.bottomAction}>
          <Pressable
            style={styles.resetButton}
            onPress={() =>
              Alert.alert(
                'Nhập lại thông tin',
                'Bạn có muốn xóa dữ liệu đang nhập?',
                [
                  { text: 'Hủy', style: 'cancel' },
                  { text: 'Nhập lại', onPress: resetForm },
                ]
              )
            }
          >
            <X size={17} color={C.orange} />
            <Text style={styles.resetText}>Nhập lại</Text>
          </Pressable>

          <Pressable
            style={[
              styles.saveButton,
              saving && { opacity: 0.65 },
            ]}
            disabled={saving}
            onPress={saveIngredient}
          >
            <Save size={18} color={C.white} />
            <Text style={styles.saveText}>
              {saving ? 'Đang lưu...' : 'Lưu vào kho'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.dark,
  },
  headerSubtitle: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: 15,
    paddingBottom: 20,
    gap: 13,
  },

  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: C.peach,
    borderRadius: 16,
    padding: 14,
  },
  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.dark,
  },
  introText: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 17,
    marginTop: 5,
  },

  formCard: {
    backgroundColor: C.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  sectionNumber: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: C.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    color: C.orange,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.dark,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },

  label: {
    fontSize: 12,
    fontWeight: '800',
    color: C.dark,
    marginBottom: 9,
    marginTop: 5,
  },
  required: {
    color: C.orange,
  },
  inputWrapper: {
    minHeight: 47,
    backgroundColor: C.cream,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 17,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: C.dark,
    paddingVertical: 12,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cream,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 11,
  },
  categoryChipActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.dark,
  },
  categoryTextActive: {
    color: C.white,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  unitButton: {
    height: 47,
    minWidth: 84,
    backgroundColor: C.peach,
    borderRadius: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.orange,
  },
  unitOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 16,
    marginTop: -5,
  },
  unitOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: C.peach,
  },
  unitOptionActive: {
    backgroundColor: C.orange,
  },
  unitOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.orange,
  },

  locationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  locationCard: {
    flex: 1,
    minHeight: 91,
    backgroundColor: C.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  locationCardActive: {
    backgroundColor: C.peach,
    borderColor: C.orange,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '800',
    color: C.muted,
  },
  selectedCheck: {
    position: 'absolute',
    right: 6,
    top: 6,
  },

  dateTip: {
    backgroundColor: C.greenLight,
    borderRadius: 11,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  dateTipText: {
    flex: 1,
    fontSize: 10,
    color: C.green,
    lineHeight: 16,
  },

  noteInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
  },
  noteInput: {
    flex: 1,
    minHeight: 90,
    fontSize: 12,
    color: C.dark,
    lineHeight: 19,
  },
  characterCount: {
    textAlign: 'right',
    color: C.muted,
    fontSize: 10,
    marginTop: 7,
  },

  previewCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 15,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 13,
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.dark,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '800',
    color: C.dark,
    marginBottom: 12,
  },
  previewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  previewChip: {
    backgroundColor: C.peach,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  previewChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.orange,
  },
  previewExpiry: {
    fontSize: 11,
    color: C.muted,
    marginTop: 13,
  },

  footerTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingHorizontal: 4,
  },
  footerTipText: {
    flex: 1,
    color: C.green,
    fontSize: 11,
    lineHeight: 17,
  },

  bottomAction: {
    backgroundColor: C.white,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  resetButton: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.peach,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resetText: {
    color: C.orange,
    fontWeight: '800',
    fontSize: 12,
  },
  saveButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: C.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '800',
  },
});
