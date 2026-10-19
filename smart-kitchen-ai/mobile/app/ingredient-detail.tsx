
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Minus,
  Plus,
  CalendarDays,
  Clock3,
  Sparkles,
  Check,
  Bell,
  Leaf,
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

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function daysRemaining(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const expiry = new Date(year, month - 1, day);

  if (
    !year || !month || !day ||
    expiry.getFullYear() !== year ||
    expiry.getMonth() !== month - 1 ||
    expiry.getDate() !== day
  ) {
    return null;
  }

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return Math.round(
    (expiry.getTime() - today.getTime()) / 86400000
  );
}

export default function IngredientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const id = first(params.id) ?? '2';
  const name = first(params.name) ?? 'Cà chua';
  const emoji = first(params.emoji) ?? '🍅';
  const unit = first(params.unit) ?? 'g';
  const expiry = first(params.expiry) ?? '2026-10-21';
  const entryDate = first(params.entryDate) ?? '2026-10-19';

  const originalQuantity = Number(
    first(params.quantity) ?? '500'
  );

  const [quantity, setQuantity] = useState(
    Number.isFinite(originalQuantity)
      ? Math.max(0, originalQuantity)
      : 0
  );

  const days = daysRemaining(expiry);

  const statusText =
    days === null
      ? 'Chưa rõ hạn dùng'
      : days < 0
        ? 'Đã hết hạn'
        : days === 0
          ? 'Hết hạn hôm nay'
          : `Còn ${days} ngày`;

  const changeQuantity = (delta: number) => {
    setQuantity((current) => Math.max(0, current + delta));
  };

  const saveChanges = () => {
    Alert.alert(
      'Lưu thay đổi',
      `Số lượng ${name}: ${quantity} ${unit}.\n\nChức năng đồng bộ số lượng với Kho thực phẩm sẽ được hoàn thiện khi tạo kho dữ liệu chung.`,
      [
        { text: 'Tiếp tục chỉnh sửa' },
        {
          text: 'Quay về kho',
          onPress: () => router.back(),
        },
      ]
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
            Chi tiết nguyên liệu
          </Text>
        </View>

        <Text style={styles.subtitle}>
          Quản lý thực phẩm theo từng lần nhập
        </Text>

        {/* THÔNG TIN NGUYÊN LIỆU */}
        <View style={styles.ingredientCard}>
          <View style={styles.emojiBox}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>

          <Text style={styles.ingredientName}>
            {name}
          </Text>

          <View style={styles.categoryBadge}>
            <Leaf size={14} color={C.green} />
            <Text style={styles.categoryText}>
              Nhóm: {emoji === '🥚'
                ? 'Trứng và sản phẩm từ trứng'
                : 'Rau củ'}
            </Text>
          </View>

          <View style={styles.expiryBadge}>
            <Clock3 size={16} color="#B87418" />
            <Text style={styles.expiryBadgeText}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* SỐ LƯỢNG */}
        <View style={styles.quantityCard}>
          <Text style={styles.sectionTitle}>
            Số lượng hiện có
          </Text>

          <Text style={styles.quantityValue}>
            {quantity} <Text style={styles.unit}>{unit}</Text>
          </Text>

          <View style={styles.stepper}>
            <Pressable
              style={styles.stepButton}
              onPress={() => changeQuantity(-1)}
              accessibilityLabel="Giảm số lượng"
            >
              <Minus size={24} color={C.orange} />
            </Pressable>

            <Text style={styles.stepValue}>
              {quantity}
            </Text>

            <Pressable
              style={styles.stepButton}
              onPress={() => changeQuantity(1)}
              accessibilityLabel="Tăng số lượng"
            >
              <Plus size={24} color={C.orange} />
            </Pressable>
          </View>

          <Text style={styles.quantityHint}>
            Nhấn + hoặc − để điều chỉnh số lượng
          </Text>
        </View>

        {/* NGÀY NHẬP VÀ HẠN SỬ DỤNG */}
        <View style={styles.dateCard}>
          <View style={styles.dateRow}>
            <CalendarDays size={20} color={C.orange} />
            <Text style={styles.dateLabel}>
              Ngày nhập:
            </Text>
            <Text style={styles.dateValue}>
              {formatDate(entryDate)}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.dateRow}>
            <Clock3 size={20} color={C.orange} />
            <Text style={styles.dateLabel}>
              Hạn sử dụng:
            </Text>
            <Text style={styles.dateValue}>
              {formatDate(expiry)}
            </Text>
          </View>
        </View>

        {/* GỢI Ý MÓN ĂN */}
        <View style={styles.suggestion}>
          <Sparkles size={20} color={C.orange} />
          <Text style={styles.suggestionText}>
            Gợi ý: {name === 'Cà chua'
              ? 'Nấu trứng sốt cà chua trước khi nguyên liệu hết hạn.'
              : `Ưu tiên sử dụng ${name.toLowerCase()} trong thực đơn sắp tới.`}
          </Text>
        </View>

        {/* NHẮC NHỞ */}
        <Pressable
          style={styles.reminder}
          onPress={() =>
            Alert.alert(
              'Nhắc nhở hạn sử dụng',
              'Chức năng đặt thông báo nhắc hạn sử dụng sẽ được kết nối sau.'
            )
          }
        >
          <Bell size={18} color="#A46A18" />
          <Text style={styles.reminderText}>
            Kiểm tra hạn dùng và đặt nhắc nhở
          </Text>
        </Pressable>

        {/* LƯU */}
        <Pressable
          style={styles.saveButton}
          onPress={saveChanges}
        >
          <Check size={20} color={C.white} />
          <Text style={styles.saveText}>
            Lưu thay đổi
          </Text>
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
    paddingHorizontal: 24,
    paddingTop: 15,
    paddingBottom: 28,
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
    fontSize: 20,
    fontWeight: '800',
    color: C.dark,
  },
  subtitle: {
    marginTop: 9,
    fontSize: 12,
    color: C.muted,
  },
  ingredientCard: {
    marginTop: 25,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    paddingVertical: 23,
    paddingHorizontal: 15,
  },
  emojiBox: {
    width: 88,
    height: 88,
    backgroundColor: C.peach,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 49,
  },
  ingredientName: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '800',
    color: C.dark,
  },
  categoryBadge: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    color: C.muted,
  },
  expiryBadge: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFF0DA',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  expiryBadgeText: {
    color: '#A46A18',
    fontSize: 12,
    fontWeight: '800',
  },
  quantityCard: {
    marginTop: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.dark,
  },
  quantityValue: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: '800',
    color: C.orange,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepper: {
    marginTop: 15,
    width: '80%',
    height: 49,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.cream,
  },
  stepButton: {
    width: 52,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.dark,
  },
  quantityHint: {
    marginTop: 10,
    fontSize: 11,
    color: C.muted,
  },
  dateCard: {
    marginTop: 16,
    padding: 17,
    borderRadius: 15,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  dateLabel: {
    fontSize: 12,
    color: C.muted,
  },
  dateValue: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '800',
    color: C.dark,
  },
  separator: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  suggestion: {
    marginTop: 16,
    padding: 15,
    backgroundColor: C.peach,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    color: C.orange,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '600',
  },
  reminder: {
    marginTop: 14,
    backgroundColor: '#FFF0DA',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#A46A18',
  },
  saveButton: {
    marginTop: 19,
    height: 53,
    backgroundColor: C.orange,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.white,
  },
});
