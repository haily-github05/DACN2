import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  UserRound,
  Pencil,
  ChefHat,
  BookOpen,
  Heart,
  Bookmark,
  CalendarDays,
  Trophy,
  Flame,
  Leaf,
  Sparkles,
  Plus,
  ChevronRight,
  Settings,
  Bell,
  CircleHelp,
  LogOut,
  ShieldCheck,
  Mail,
  Phone,
  Clock3,
  UsersRound,
  UtensilsCrossed,
  X,
  Check,
  ShoppingBasket,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

const C = {
  orange: "#A23A00",
  orangeLight: "#D86A2E",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  peachDark: "#FBE3D5",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  white: "#FFFFFF",
  green: "#397C57",
  greenLight: "#E9F5EB",
};

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export default function ProfileScreen() {
  const router = useRouter();

  const [name, setName] = useState("Người dùng Smart Kitchen");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(email);
  const [draftPhone, setDraftPhone] = useState(phone);

  const [editVisible, setEditVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Dữ liệu minh họa, thay bằng API khi có backend
  const stats = {
    cooked: 12,
    saved: 8,
    shared: 3,
    streak: 5,
  };

  const navigate = (path: string) => {
    router.push(path as any);
  };

  const openEdit = () => {
    setDraftName(name);
    setDraftEmail(email);
    setDraftPhone(phone);
    setEditVisible(true);
  };

  const saveProfile = () => {
    if (!draftName.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập họ tên.");
      return;
    }

    setName(draftName.trim());
    setEmail(draftEmail.trim());
    setPhone(draftPhone.trim());
    setEditVisible(false);

    Alert.alert("Thành công", "Thông tin đã được cập nhật trên giao diện.");
  };

  const showComingSoon = (feature: string) => {
    Alert.alert(
      feature,
      "Chức năng này sẽ được kết nối khi hoàn thiện dữ liệu và hệ thống tài khoản.",
    );
  };

  const logout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn đăng xuất khỏi Smart Kitchen AI?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => {
          // TODO: Xóa token / phiên đăng nhập tại đây.
          router.replace("/" as any);
        },
      },
    ]);
  };

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  const MenuItem = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    color = C.orange,
    background = C.peach,
    right,
  }: {
    icon: IconComponent;
    title: string;
    subtitle?: string;
    onPress: () => void;
    color?: string;
    background?: string;
    right?: React.ReactNode;
  }) => (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: background }]}>
        <Icon size={19} color={color} />
      </View>

      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>

      {right ?? <ChevronRight size={18} color="#A38D82" />}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <AppHeader showNotification unreadCount={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.pageHeading}>
          <View>
            <Text style={styles.eyebrow}>TÀI KHOẢN CỦA BẠN</Text>
            <Text style={styles.pageTitle}>Trang cá nhân</Text>
            <Text style={styles.pageSubtitle}>
              Không gian bếp của riêng bạn ✨
            </Text>
          </View>

          <Pressable
            style={styles.settingsButton}
            onPress={() => showComingSoon("Cài đặt nâng cao")}
          >
            <Settings size={21} color={C.orange} />
          </Pressable>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || "SK"}</Text>
              <View style={styles.avatarStatus}>
                <Check size={11} color={C.white} />
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>

              <View style={styles.memberBadge}>
                <Leaf size={12} color={C.green} />
                <Text style={styles.memberBadgeText}>
                  Thành viên Smart Kitchen AI
                </Text>
              </View>

              <Text style={styles.profileMeta}>
                {email || "Thêm email để hoàn thiện hồ sơ"}
              </Text>
            </View>

            <Pressable style={styles.editButton} onPress={openEdit}>
              <Pencil size={16} color={C.orange} />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ChefHat size={19} color={C.orange} />
              <Text style={styles.statNumber}>{stats.cooked}</Text>
              <Text style={styles.statLabel}>Món đã nấu</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Bookmark size={19} color={C.orange} />
              <Text style={styles.statNumber}>{stats.saved}</Text>
              <Text style={styles.statLabel}>Đã lưu</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <UsersRound size={19} color={C.orange} />
              <Text style={styles.statNumber}>{stats.shared}</Text>
              <Text style={styles.statLabel}>Đã chia sẻ</Text>
            </View>
          </View>

          <View style={styles.profileTip}>
            <Sparkles size={17} color={C.green} />
            <Text style={styles.profileTipText}>
              Mỗi bữa ăn ngon là một bước chăm sóc bản thân!
            </Text>
          </View>
        </View>

        {/* ACHIEVEMENTS */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>🏆 Thành tích của bạn</Text>
            <Text style={styles.sectionSubtitle}>
              Hành trình vào bếp mỗi ngày
            </Text>
          </View>
        </View>

        <View style={styles.achievementRow}>
          <View style={styles.achievementCard}>
            <View style={styles.achievementIcon}>
              <Flame size={21} color={C.orange} />
            </View>
            <Text style={styles.achievementNumber}>{stats.streak} ngày</Text>
            <Text style={styles.achievementName}>Chuỗi vào bếp</Text>
            <Text style={styles.achievementHint}>Tiếp tục duy trì!</Text>
          </View>

          <View style={styles.achievementCard}>
            <View style={styles.achievementIcon}>
              <ChefHat size={21} color={C.orange} />
            </View>
            <Text style={styles.achievementNumber}>{stats.cooked} món</Text>
            <Text style={styles.achievementName}>Đầu bếp tại gia</Text>
            <Text style={styles.achievementHint}>Càng nấu càng giỏi</Text>
          </View>

          <View style={styles.achievementCard}>
            <View
              style={[
                styles.achievementIcon,
                { backgroundColor: C.greenLight },
              ]}
            >
              <Leaf size={21} color={C.green} />
            </View>
            <Text style={styles.achievementNumber}>Sống xanh</Text>
            <Text style={styles.achievementName}>Yêu thực phẩm</Text>
            <Text style={styles.achievementHint}>Hạn chế lãng phí</Text>
          </View>
        </View>

        {/* AI FEATURE */}
        <Pressable style={styles.aiCard} onPress={() => navigate("/recipes")}>
          <View style={styles.aiIcon}>
            <Sparkles size={22} color={C.white} />
          </View>

          <View style={styles.aiInfo}>
            <Text style={styles.aiTitle}>Bạn muốn nấu gì hôm nay?</Text>
            <Text style={styles.aiDescription}>
              Khám phá món ngon từ nguyên liệu có sẵn.
            </Text>
          </View>

          <View style={styles.aiAction}>
            <ChevronRight size={19} color={C.white} />
          </View>
        </Pressable>

        {/* MY KITCHEN */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>🍳 Góc bếp của tôi</Text>
            <Text style={styles.sectionSubtitle}>
              Quản lý công thức và thực phẩm
            </Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          <MenuItem
            icon={Heart}
            title="Công thức yêu thích"
            subtitle="Khám phá những món ăn bạn yêu thích"
            onPress={() => navigate("/recipes")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon={Bookmark}
            title="Bộ sưu tập đã lưu"
            subtitle="Xem các công thức đã đánh dấu"
            onPress={() => showComingSoon("Bộ sưu tập đã lưu")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon={Clock3}
            title="Lịch sử nấu ăn"
            subtitle="Những món bạn đã thực hiện"
            onPress={() => showComingSoon("Lịch sử nấu ăn")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon={ShoppingBasket}
            title="Kho thực phẩm"
            subtitle="Theo dõi nguyên liệu trong bếp"
            onPress={() => navigate("/pantry")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon={CalendarDays}
            title="Thực đơn của tôi"
            subtitle="Lên kế hoạch ăn uống mỗi ngày"
            onPress={() => navigate("/meal-plan")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon={UsersRound}
            title="Bài viết cộng đồng"
            subtitle="Khám phá và chia sẻ món ngon"
            onPress={() => navigate("/community")}
          />
        </View>

        {/* SETTINGS */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>
              <Settings size={17} color={C.orange} /> Thiết lập & Tài khoản
            </Text>
            <Text style={styles.sectionSubtitle}>
              Quản lý thông tin cá nhân
            </Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          <MenuItem
            icon={UserRound}
            title="Chỉnh sửa hồ sơ"
            subtitle="Tên, email và số điện thoại"
            onPress={openEdit}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon={Bell}
            title="Thông báo"
            subtitle="Bật hoặc tắt thông báo ứng dụng"
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: "#E6D9D1",
                  true: "#E7AD8B",
                }}
                thumbColor={notificationsEnabled ? C.orange : "#FFFFFF"}
              />
            }
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon={ShieldCheck}
            title="Bảo mật tài khoản"
            subtitle="Quản lý thông tin đăng nhập"
            onPress={() => showComingSoon("Bảo mật tài khoản")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon={LogOut}
            title="Đăng xuất"
            subtitle="Thoát khỏi tài khoản hiện tại"
            color="#D94C42"
            background="#FFF0EE"
            onPress={logout}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Smart Kitchen AI</Text>
          <Text style={styles.footerText}>
            Bếp thông minh, cuộc sống tiện nghi 💛
          </Text>
          <Text style={styles.version}>Phiên bản giao diện 1.0</Text>
        </View>
      </ScrollView>

      <BottomNav />

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
                <Text style={styles.modalSubtitle}>
                  Cập nhật thông tin của bạn
                </Text>
              </View>

              <Pressable
                onPress={() => setEditVisible(false)}
                style={styles.modalClose}
              >
                <X size={20} color={C.muted} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Nhập họ tên"
              placeholderTextColor="#A18B81"
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={draftEmail}
              onChangeText={setDraftEmail}
              placeholder="Nhập email"
              placeholderTextColor="#A18B81"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={draftPhone}
              onChangeText={setDraftPhone}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#A18B81"
              keyboardType="phone-pad"
            />

            <Pressable style={styles.saveButton} onPress={saveProfile}>
              <Check size={19} color={C.white} />
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 17,
    paddingTop: 22,
    paddingBottom: 38,
  },

  pageHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 19,
  },

  eyebrow: {
    fontSize: 10,
    color: C.orange,
    fontWeight: "800",
    letterSpacing: 1,
  },

  pageTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: C.dark,
    marginTop: 6,
  },

  pageSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 5,
  },

  settingsButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },

  profileCard: {
    backgroundColor: C.white,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },

  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: C.peachDark,
    borderWidth: 3,
    borderColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  avatarText: {
    fontSize: 23,
    fontWeight: "800",
    color: C.orange,
  },

  avatarStatus: {
    position: "absolute",
    right: -2,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },

  profileInfo: {
    flex: 1,
    gap: 5,
  },

  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: C.dark,
  },

  memberBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.greenLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  memberBadgeText: {
    color: C.green,
    fontSize: 9,
    fontWeight: "700",
  },

  profileMeta: {
    fontSize: 10,
    color: C.muted,
  },

  editButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 19,
    paddingTop: 17,
    paddingBottom: 15,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: C.dark,
  },

  statLabel: {
    fontSize: 10,
    color: C.muted,
  },

  statDivider: {
    height: 42,
    width: 1,
    backgroundColor: C.border,
  },

  profileTip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: C.greenLight,
    borderRadius: 12,
    padding: 12,
  },

  profileTipText: {
    flex: 1,
    fontSize: 11,
    color: C.green,
    fontWeight: "600",
    lineHeight: 17,
  },

  sectionHeading: {
    marginTop: 27,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 5,
  },

  achievementRow: {
    flexDirection: "row",
    gap: 9,
  },

  achievementCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    padding: 11,
    minHeight: 142,
  },

  achievementIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  achievementNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },

  achievementName: {
    fontSize: 10,
    fontWeight: "700",
    color: C.dark,
    marginTop: 5,
  },

  achievementHint: {
    fontSize: 9,
    color: C.orange,
    marginTop: 7,
    lineHeight: 13,
  },

  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.peach,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E7C7B7",
    padding: 14,
    gap: 11,
    marginTop: 21,
  },

  aiIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
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
    marginTop: 5,
  },

  aiAction: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: C.orange,
    alignItems: "center",
    justifyContent: "center",
  },

  menuCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    overflow: "hidden",
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    minHeight: 66,
  },

  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  menuText: {
    flex: 1,
    gap: 5,
  },

  menuTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.dark,
  },

  menuSubtitle: {
    fontSize: 10,
    color: C.muted,
    lineHeight: 15,
  },

  menuDivider: {
    height: 1,
    backgroundColor: "#F4EAE5",
    marginLeft: 52,
  },

  footer: {
    alignItems: "center",
    paddingTop: 31,
    gap: 7,
  },

  footerBrand: {
    fontSize: 15,
    fontWeight: "800",
    color: C.orange,
  },

  footerText: {
    fontSize: 11,
    color: C.muted,
  },

  version: {
    fontSize: 10,
    color: "#A48E83",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(32,26,23,0.45)",
  },

  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 22,
    paddingBottom: 35,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 23,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: C.dark,
  },

  modalSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 5,
  },

  modalClose: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 8,
  },

  input: {
    height: 49,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 13,
    color: C.dark,
    backgroundColor: C.cream,
    marginBottom: 17,
  },

  saveButton: {
    height: 49,
    borderRadius: 13,
    backgroundColor: C.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 6,
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.white,
  },
});
