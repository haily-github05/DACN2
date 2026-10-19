import React, { useState } from "react";

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Linking,
} from "react-native";

import { useRouter } from "expo-router";

import {
  ChefHat,
  Bell,
  CircleHelp,
  ArrowLeft,
  Phone,
  Mail,
  BookOpen,
  X,
  ChevronRight,
  Headphones,
} from "lucide-react-native";

type AppHeaderProps = {
  showBack?: boolean;
  showNotification?: boolean;
  showHelp?: boolean;
  unreadCount?: number;
  onNotificationPress?: () => void;
  onHelpPress?: () => void;
};

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
};

export default function AppHeader({
  showBack = false,
  showNotification = false,
  showHelp = true,
  unreadCount = 0,
  onNotificationPress,
  onHelpPress,
}: AppHeaderProps) {
  const router = useRouter();

  const [helpVisible, setHelpVisible] = useState(false);

  // NÚT THÔNG BÁO
  const handleNotification = () => {
    if (onNotificationPress) {
      onNotificationPress();
      return;
    }

    router.push("/notifications" as any);
  };

  // NÚT TRỢ GIÚP
  const handleHelp = () => {
    if (onHelpPress) {
      onHelpPress();
      return;
    }

    setHelpVisible(true);
  };

  // MỞ SỐ ĐIỆN THOẠI
  const callSupport = async () => {
    try {
      await Linking.openURL("tel:0865529572");
    } catch {
      Alert.alert("Lỗi", "Không thể mở ứng dụng gọi điện.");
    }
  };

  const emailSupport = async () => {
    try {
      await Linking.openURL(
        "mailto:smartkitchenai@gmail.com?subject=Ho%20tro%20Smart%20Kitchen%20AI",
      );
    } catch {
      Alert.alert("Lỗi", "Không thể mở ứng dụng email.");
    }
  };

  // HƯỚNG DẪN SỬ DỤNG
  const showGuide = () => {
    setHelpVisible(false);

    Alert.alert(
      "Hướng dẫn sử dụng",
      "1. Quét nguyên liệu bằng AI hoặc nhập thủ công.\n\n" +
      "2. Kiểm tra số lượng và hạn sử dụng trong Kho.\n\n" +
      "3. Xem các món ăn được gợi ý.\n\n" +
      "4. Lập thực đơn theo số ngày mong muốn.\n\n" +
      "5. Tạo danh sách mua sắm và cập nhật kho sau khi nấu.",
      [{ text: "Đã hiểu" }],
    );
  };

  return (
    <>
      {/* HEADER */}
      <View style={styles.header}>
        {/* LEFT */}
        <View style={styles.left}>
          {showBack && (
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <ArrowLeft size={21} color={C.orange} />
            </Pressable>
          )}

          <View style={styles.logo}>
            <ChefHat size={22} color={C.orange} strokeWidth={2.2} />
          </View>

          <Text style={styles.brand} numberOfLines={1}>
            SMART KITCHEN AI
          </Text>
        </View>

        {/* RIGHT */}
        <View style={styles.right}>
          {showNotification && (
            <Pressable
              style={styles.iconButton}
              onPress={handleNotification}
              accessibilityLabel="Thông báo"
            >
              <Bell size={21} color={C.orange} />

              {unreadCount > 0 && <View style={styles.notificationDot} />}
            </Pressable>
          )}

          {showHelp && (
            <Pressable
              style={styles.iconButton}
              onPress={handleHelp}
              accessibilityLabel="Trợ giúp"
            >
              <CircleHelp size={22} color={C.orange} />
            </Pressable>
          )}
        </View>
      </View>

      {/* POPUP TRỢ GIÚP */}
      <Modal
        visible={helpVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setHelpVisible(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setHelpVisible(false)}
          />

          <View style={styles.modalCard}>
            {/* ICON */}
            <View style={styles.helpIcon}>
              <Headphones size={30} color={C.orange} />
            </View>

            {/* TIÊU ĐỀ */}
            <Text style={styles.modalTitle}>Trung tâm trợ giúp</Text>

            <Text style={styles.modalSubtitle}>
              Smart Kitchen AI luôn sẵn sàng hỗ trợ bạn trong quá trình sử dụng.
            </Text>

            {/* SỐ ĐIỆN THOẠI */}
            <Pressable style={styles.contactRow} onPress={callSupport}>
              <View style={styles.contactIcon}>
                <Phone size={21} color={C.orange} />
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Hotline hỗ trợ</Text>

                <Text style={styles.contactValue}>0865 529 572</Text>
              </View>

              <ChevronRight size={18} color={C.muted} />
            </Pressable>

            {/* EMAIL */}
            <Pressable style={styles.contactRow} onPress={emailSupport}>
              <View style={styles.contactIcon}>
                <Mail size={21} color={C.orange} />
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email hỗ trợ</Text>

                <Text style={styles.contactValue}>smartkitchenai@gmail.com</Text>
              </View>

              <ChevronRight size={18} color={C.muted} />
            </Pressable>

            {/* HƯỚNG DẪN */}
            <Pressable style={styles.contactRow} onPress={showGuide}>
              <View style={styles.contactIcon}>
                <BookOpen size={21} color={C.orange} />
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Hướng dẫn sử dụng</Text>

                <Text style={styles.contactValue}>
                  Cách sử dụng Smart Kitchen AI
                </Text>
              </View>

              <ChevronRight size={18} color={C.muted} />
            </Pressable>

            {/* ĐÓNG */}
            <Pressable
              style={styles.closeButton}
              onPress={() => setHelpVisible(false)}
            >
              <X size={18} color={C.white} />

              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>

            <Text style={styles.footerText}>
              Smart Kitchen AI · Bếp thông minh
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    width: "100%",
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  logo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FFF0E7",
    justifyContent: "center",
    alignItems: "center",
  },

  brand: {
    fontSize: 15,
    fontWeight: "800",
    color: C.orange,
    flexShrink: 1,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.cream,
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E44836",
    borderWidth: 1,
    borderColor: C.white,
  },

  backButton: {
    width: 30,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  // POPUP
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
  },

  helpIcon: {
    width: 65,
    height: 65,
    borderRadius: 20,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: C.dark,
    textAlign: "center",
  },

  modalSubtitle: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 9,
    marginBottom: 21,
  },

  contactRow: {
    width: "100%",
    minHeight: 70,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 11,
  },

  contactIcon: {
    width: 42,
    height: 42,
    backgroundColor: C.peach,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  contactInfo: {
    flex: 1,
    gap: 5,
  },

  contactTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },

  contactValue: {
    fontSize: 11,
    color: C.muted,
  },

  closeButton: {
    marginTop: 10,
    width: "100%",
    height: 47,
    borderRadius: 12,
    backgroundColor: C.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  closeText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.white,
  },

  footerText: {
    fontSize: 10,
    color: C.muted,
    marginTop: 15,
  },
});
