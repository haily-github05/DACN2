import React from "react";
import { ImageBackground } from "react-native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require("../assets/welcome-bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "rgba(32, 15, 8, 0.45)" }}
      >
        <View style={styles.content}>
          <Text style={styles.brand}>SMART</Text>
          <Text style={styles.brand}>KITCHEN AI</Text>

          <View style={styles.line} />

          <Text style={styles.subtitle}>Nấu ngon hơn mỗi ngày</Text>

          <View style={styles.features}>
            <Text style={styles.feature}>Quản lý nguyên liệu dễ dàng</Text>
            <Text style={styles.feature}>Gợi ý món ngon bằng AI</Text>
            <Text style={styles.feature}>
              Tiết kiệm thực phẩm, giảm lãng phí
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/intro")}
          >
            <Text style={styles.buttonText}>BẮT ĐẦU →</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Khám phá căn bếp thông minh của bạn
          </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4B281D",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  brand: {
    color: "#FFF8F6",
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
  },
  line: {
    width: 90,
    height: 3,
    backgroundColor: "#FFC78A",
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 3,
  },
  subtitle: {
    color: "#FFF8F6",
    fontSize: 19,
    fontWeight: "700",
  },
  features: {
    marginTop: 48,
    alignItems: "center",
    gap: 14,
  },
  feature: {
    color: "#FFF8F6",
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 25,
    paddingBottom: 35,
    gap: 20,
  },
  button: {
    height: 59,
    backgroundColor: "#A23A00",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  footerText: {
    color: "#FFF8F6",
    textAlign: "center",
    fontSize: 12,
  },
});
