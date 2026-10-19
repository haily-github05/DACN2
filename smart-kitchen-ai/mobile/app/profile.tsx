
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  UserRound,
  Heart,
  AlertCircle,
  Clock3,
  Bell,
  ChevronRight,
} from 'lucide-react-native';

import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';

const C = {
  background: '#FFF8F6',
  white: '#FFFFFF',
  orange: '#A23A00',
  peach: '#FEF1EB',
  border: '#EED9CF',
  dark: '#201A17',
  muted: '#735A51',
};

export default function ProfileScreen() {
  const router = useRouter();

  const openPreferences = () => {
    router.push('/preferences' as any);
  };

  const openNotifications = () => {
    router.push('/notifications' as any);
  };

  return (
    <SafeAreaView
      style={styles.screen}
      edges={[]}
    >
      <AppHeader
        showNotification
        unreadCount={3}
      />

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
            <ArrowLeft size={25} color={C.orange} />
          </Pressable>

          <Text style={styles.title}>
            Tài khoản của tôi
          </Text>
        </View>

        <Text style={styles.subtitle}>
          Cá nhân hóa trải nghiệm Smart Kitchen
        </Text>

        {/* THẺ THÔNG TIN TÀI KHOẢN */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <UserRound
              size={35}
              color={C.orange}
              strokeWidth={1.8}
            />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              Người dùng Smart Kitchen
            </Text>

            <Pressable
              style={styles.editProfile}
              onPress={() =>
                Alert.alert(
                  'Chỉnh sửa hồ sơ',
                  'Chức năng cập nhật thông tin cá nhân sẽ được kết nối với tài khoản người dùng.'
                )
              }
            >
              <Text style={styles.editText}>
                Chỉnh sửa hồ sơ
              </Text>

              <ChevronRight
                size={16}
                color={C.orange}
              />
            </Pressable>
          </View>
        </View>

        {/* THIẾT LẬP SỞ THÍCH */}
        <Text style={styles.sectionTitle}>
          Thiết lập sở thích
        </Text>

        <Pressable
          style={styles.settingCard}
          onPress={openPreferences}
        >
          <View style={styles.settingIcon}>
            <Heart
              size={29}
              color={C.orange}
              strokeWidth={1.8}
            />
          </View>

          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>
              Khẩu vị & chế độ ăn
            </Text>

            <Text style={styles.settingDescription}>
              Ăn ít cay · Ưu tiên rau xanh
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.settingCard}
          onPress={openPreferences}
        >
          <View style={styles.settingIcon}>
            <AlertCircle
              size={29}
              color={C.orange}
              strokeWidth={1.8}
            />
          </View>

          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>
              Dị ứng thực phẩm
            </Text>

            <Text style={styles.settingDescription}>
              Chưa thiết lập
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.settingCard}
          onPress={openNotifications}
        >
          <View style={styles.settingIcon}>
            <Clock3
              size={29}
              color={C.orange}
              strokeWidth={1.8}
            />
          </View>

          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>
              Thông báo hạn sử dụng
            </Text>

            <Text style={styles.settingDescription}>
              Bật nhắc trước 2 ngày
            </Text>
          </View>
        </Pressable>

        {/* NGÔN NGỮ VÀ TRỢ GIÚP */}
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.quickButton, { flex: 190 }]}
            onPress={() =>
              Alert.alert(
                'Ngôn ngữ',
                'Ngôn ngữ hiện tại: Tiếng Việt'
              )
            }
          >
            <Text style={styles.quickText}>
              Ngôn ngữ: Tiếng Việt
            </Text>
          </Pressable>

          <Pressable
            style={[styles.quickButton, { flex: 144 }]}
            onPress={() =>
              Alert.alert(
                'Trợ giúp',
                'Smart Kitchen AI – Trợ lý bếp thông minh.'
              )
            }
          >
            <Text style={styles.quickText}>
              Trợ giúp
            </Text>
          </Pressable>
        </View>

        {/* NHẮC NHỞ */}
        <Pressable
          style={styles.notice}
          onPress={openNotifications}
        >
          <Bell size={17} color={C.orange} />

          <Text style={styles.noticeText}>
            Cài đặt nhắc hạn dùng và thông báo
          </Text>
        </Pressable>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.background,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 23,
  },

  heading: {
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  backButton: {
    width: 24,
    height: 40,
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

  profileCard: {
    marginTop: 27,
    height: 115,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 17,
    gap: 13,
  },

  avatar: {
    width: 73,
    height: 73,
    backgroundColor: C.peach,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInfo: {
    flex: 1,
    gap: 13,
  },

  profileName: {
    fontSize: 14,
    fontWeight: '800',
    color: C.dark,
  },

  editProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  editText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.orange,
  },

  sectionTitle: {
    marginTop: 32,
    marginBottom: 17,
    fontSize: 17,
    fontWeight: '800',
    color: C.dark,
  },

  settingCard: {
    height: 85,
    borderRadius: 15,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 15,
  },

  settingIcon: {
    width: 59,
    height: 59,
    borderRadius: 13,
    backgroundColor: C.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingInfo: {
    flex: 1,
    gap: 9,
  },

  settingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.dark,
  },

  settingDescription: {
    fontSize: 11,
    color: C.muted,
  },

  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  quickButton: {
    height: 33,
    backgroundColor: C.peach,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },

  quickText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.orange,
  },

  notice: {
    marginTop: 12,
    height: 45,
    borderRadius: 11,
    backgroundColor: C.peach,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 7,
  },

  noticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.orange,
    flexShrink: 1,
  },
});
