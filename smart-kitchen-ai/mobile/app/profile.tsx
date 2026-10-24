import React, { useState, useCallback } from "react";

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
  Image,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter, useFocusEffect } from "expo-router";
import { getCurrentUserId } from "../lib/auth";
import { getProfile, avatarSource } from "../lib/profileApi";
import {
  getUserPreferences,
  type StoredPreferences,
} from "../lib/preferencesApi";

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

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<StoredPreferences | null>(
    null,
  );
  const [preferencesError, setPreferencesError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const userId = await getCurrentUserId();
          const user = await getProfile(userId);
          if (!active) return;
          setName(user.full_name);
          setEmail(user.email ?? "");
          setPhone(user.phone ?? "");
          setAvatarUrl(user.avatar_url);
          try {
            const pref = await getUserPreferences(userId);
            if (active) {
              setPreferences(pref);
              setPreferencesError("");
            }
          } catch (prefError) {
            if (active) {
              setPreferences(null);
              setPreferencesError(
                prefError instanceof Error
                  ? prefError.message
                  : "Không thể tải sở thích",
              );
            }
          }
        } catch (e) {
          if (active)
            Alert.alert(
              "Lỗi tải hồ sơ",
              e instanceof Error ? e.message : "Không tải được hồ sơ",
            );
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

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

  const openEdit = () => router.push("/edit-profile" as any);
  const editPreferences = () =>
    router.push({
      pathname: "/onboarding-preferences",
      params: { from: "profile" },
    } as any);

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
            <Pressable style={styles.avatar} onPress={openEdit}>
              {avatarSource(avatarUrl) ? (
                <Image
                  source={{ uri: avatarSource(avatarUrl)! }}
                  style={{ width: "100%", height: "100%", borderRadius: 33 }}
                />
              ) : (
                <Text style={styles.avatarText}>{initials || "SK"}</Text>
              )}
              <View style={styles.avatarStatus}>
                <Check size={11} color={C.white} />
              </View>
            </Pressable>

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
        {/* SỞ THÍCH ĂN UỐNG - LẤY TỪ MYSQL */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>🥗 Sở thích ăn uống</Text>
            <Text style={styles.sectionSubtitle}>
              Thiết lập thực đơn dành riêng cho bạn
            </Text>
          </View>
        </View>
        <View style={styles.menuCard}>
          <View style={styles.prefBody}>
            {preferences ? (
              <>
                <Text style={styles.prefLine}>
                  Chế độ ăn:{" "}
                  <Text style={styles.prefValue}>
                    {preferences.diet || "Chưa chọn"}
                  </Text>
                </Text>
                <Text style={styles.prefLine}>
                  Khẩu vị:{" "}
                  <Text style={styles.prefValue}>
                    {preferences.tastes?.join(", ") || "Chưa chọn"}
                  </Text>
                </Text>
                <Text style={styles.prefLine}>
                  Vùng miền:{" "}
                  <Text style={styles.prefValue}>
                    {preferences.region || "Chưa chọn"}
                  </Text>
                </Text>
                <Text style={styles.prefLine}>
                  Ngân sách:{" "}
                  <Text style={styles.prefValue}>
                    {Number(preferences.budget || 0).toLocaleString("vi-VN")}
                    đ/ngày
                  </Text>
                </Text>
                <Text style={styles.prefLine}>
                  Số người ăn:{" "}
                  <Text style={styles.prefValue}>
                    {preferences.people || 1}
                  </Text>
                </Text>
                <Text style={styles.prefLine}>
                  Thời gian nấu:{" "}
                  <Text style={styles.prefValue}>
                    {preferences.cookTime || 0} phút
                  </Text>
                </Text>
              </>
            ) : (
              <Text style={styles.prefLine}>
                {preferencesError || "Chưa có dữ liệu sở thích ăn uống."}
              </Text>
            )}
          </View>
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Pencil}
            title="Chỉnh sửa sở thích ăn uống"
            subtitle="Cập nhật chế độ ăn, khẩu vị và ngân sách"
            onPress={editPreferences}
          />
        </View>

        {/* LƯU Ý CỦA TÔI - DỊ ỨNG VÀ NGUYÊN LIỆU KHÔNG THÍCH */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>📝 Lưu ý của tôi</Text>
            <Text style={styles.sectionSubtitle}>
              Những điều cần chú ý khi gợi ý món ăn
            </Text>
          </View>
        </View>
        <View style={styles.menuCard}>
          <View style={styles.prefBody}>
            <Text style={styles.prefLine}>Dị ứng thực phẩm</Text>
            <Text style={styles.prefValue}>
              {preferences?.allergies?.length
                ? preferences.allergies.join(", ")
                : "Chưa có thông tin dị ứng"}
            </Text>
            <View style={styles.prefSeparator} />
            <Text style={styles.prefLine}>Nguyên liệu không thích</Text>
            <Text style={styles.prefValue}>
              {preferences?.dislikes?.length
                ? preferences.dislikes.join(", ")
                : "Chưa có nguyên liệu cần tránh"}
            </Text>
          </View>
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Pencil}
            title="Chỉnh sửa lưu ý"
            subtitle="Cập nhật dị ứng và nguyên liệu không thích"
            onPress={editPreferences}
          />
        </View>

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
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  prefBody: { paddingHorizontal: 17, paddingVertical: 17, gap: 8 },
  prefLine: { color: C.muted, fontSize: 13, lineHeight: 20 },
  prefValue: { color: C.dark, fontWeight: "600", fontSize: 13, lineHeight: 21 },
  prefSeparator: { height: 1, backgroundColor: C.border, marginVertical: 7 },

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
