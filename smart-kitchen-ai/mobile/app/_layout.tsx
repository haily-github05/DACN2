// Bố cục gốc: chỉ giữ vùng an toàn phía trên; mỗi thanh dưới xử lý khoảng đệm riêng.
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#FFF8F6" }}>
      <StatusBar style="dark" />
      <Slot />
    </SafeAreaView>
  );
}
