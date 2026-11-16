import RequireLogin from "../components/RequireLogin";
// Trang: Quét nguyên liệu — chọn ảnh, gửi model và chuyển kết quả nhận diện sang màn xác nhận.
import React, { useEffect, useRef, useState } from "react";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {analyzePhoto} from "../lib/scanApi";

import {
  ArrowLeft,
  ScanLine,
  Camera,
  ImageUp,
  Lightbulb,
  Sparkles,
  RotateCcw,
} from "lucide-react-native";

const COLORS = {
  primary: "#A23A00",
  background: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
};

function ScanScreen() {
  const [analyzing,setAnalyzing]=useState(false);
  const analyzeLock=useRef(false),controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>{const current=controller.current;controller.current=null;current?.abort();},[]);

  const router = useRouter();

  const [photo, setPhoto] = useState<string | null>(null);

  // Chụp ảnh bằng camera iPhone
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Quyền truy cập camera",
          "Bạn cần cho phép ứng dụng sử dụng camera để chụp nguyên liệu.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Lỗi", "Không thể mở camera.");
    }
  };

  // Chọn ảnh từ thư viện
  const choosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
    }
  };

  // Gửi ảnh đến model; không dùng kết quả mẫu khi model lỗi hoặc chưa chạy.
  const handleAnalyze = async () => {
    if(!photo||analyzeLock.current)return;
    analyzeLock.current=true;setAnalyzing(true);
    const request=new AbortController();controller.current=request;
    const timeout=setTimeout(()=>request.abort(),60000);
    try{
      const detections=await analyzePhoto(photo,request.signal);
      if(!request.signal.aborted)router.push({pathname:"/scan-result",params:{photo,detections:JSON.stringify(detections)}});
    }catch(error){
      if(controller.current===request)Alert.alert("Không thể phân tích",request.signal.aborted?"Yêu cầu đã hết thời gian. Hãy thử lại.":error instanceof Error?error.message:"Không kết nối được dịch vụ nhận diện. Kiểm tra địa chỉ và máy chủ model.");
    }finally{clearTimeout(timeout);if(controller.current===request){controller.current=null;analyzeLock.current=false;setAnalyzing(false);}}
  };



  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <AppHeader showNotification />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TIÊU ĐỀ */}
        <View style={styles.heading}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={23} color={COLORS.primary} />
          </Pressable>

          <Text style={styles.title}>Nhận diện nguyên liệu</Text>
        </View>

        <Text style={styles.subtitle}>
          Chụp hoặc tải ảnh để AI nhận biết thực phẩm
        </Text>

        {/* KHUNG QUÉT AI */}
        <View style={styles.scanBox}>
          <View style={styles.scanBadge}>
            <Sparkles size={15} color={COLORS.primary} />
            <Text style={styles.scanBadgeText}>AI SCAN</Text>
          </View>

          {photo ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: photo }}
                style={styles.preview}
                resizeMode="contain"
              />

              <Pressable
                style={styles.changePhoto}
                disabled={analyzing}
                onPress={() => setPhoto(null)}
              >
                <RotateCcw size={15} color={COLORS.primary} />
                <Text style={styles.changePhotoText}>Chọn lại ảnh</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.scanPlaceholder}>
              <View style={styles.scanIcon}>
                <ScanLine size={52} color={COLORS.primary} strokeWidth={1.5} />
              </View>

              <Text style={styles.scanTitle}>
                Đặt nguyên liệu vào khung hình
              </Text>

              <Text style={styles.scanDescription}>
                Ảnh rõ nét giúp AI nhận diện tốt hơn
              </Text>
            </View>
          )}
        </View>

        {/* MẸO CHỤP ẢNH */}
        <View style={styles.tipBox}>
          <Lightbulb size={19} color="#B87920" />
          <Text style={styles.tipText}>
            Mẹo: Chụp từ trên xuống, đủ ánh sáng
          </Text>
        </View>

        {/* NÚT CHỤP ẢNH */}
        <Pressable style={styles.cameraButton} onPress={takePhoto} disabled={analyzing}>
          <Camera size={21} color="#FFFFFF" />
          <Text style={styles.cameraButtonText}>Chụp ảnh</Text>
        </Pressable>

        {/* NÚT CHỌN ẢNH */}
        <Pressable style={styles.libraryButton} onPress={choosePhoto} disabled={analyzing}>
          <ImageUp size={21} color={COLORS.primary} />
          <Text style={styles.libraryButtonText}>Chọn ảnh từ thư viện</Text>
        </Pressable>

        {/* NÚT PHÂN TÍCH */}
        {photo && (
          <Pressable style={[styles.analyzeButton,analyzing&&{opacity:0.65}]} onPress={handleAnalyze} disabled={analyzing} accessibilityState={{busy:analyzing}}>
            {analyzing?<ActivityIndicator color="#FFFFFF"/>:<Sparkles size={18} color="#FFFFFF"/>}
            <Text style={styles.analyzeText}>{analyzing?"Đang phân tích…":"Phân tích nguyên liệu"}</Text>
          </Pressable>
        )}

        {/* HƯỚNG DẪN */}
        <View style={styles.infoBox}>
          <View style={styles.infoHeading}>
            <Sparkles size={17} color={COLORS.primary} />
            <Text style={styles.infoTitle}>Sau khi chọn ảnh</Text>
          </View>

          <Text style={styles.infoDescription}>
            AI sẽ phân tích và chuyển sang trang xác nhận để bạn chỉnh sửa trước
            khi lưu vào kho.
          </Text>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 25,
    height: 34,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.muted,
  },
  scanBox: {
    marginTop: 30,
    height: 230,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  scanBadge: {
    position: "absolute",
    top: 14,
    left: 16,
    zIndex: 2,
    backgroundColor: COLORS.peach,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  scanBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },
  scanPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
  },
  scanIcon: {
    width: 76,
    height: 76,
    backgroundColor: COLORS.peach,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  scanTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.dark,
    textAlign: "center",
  },
  scanDescription: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 9,
    textAlign: "center",
  },
  previewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  changePhoto: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  tipBox: {
    marginTop: 16,
    marginBottom: 22,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: "#FFF0DA",
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  tipText: {
    fontSize: 12,
    color: "#94621C",
    flex: 1,
  },
  cameraButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cameraButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.white,
  },
  libraryButton: {
    height: 52,
    marginTop: 13,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  libraryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },
  analyzeButton: {
    height: 49,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#39845A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  analyzeText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "800",
  },
  infoBox: {
    marginTop: 24,
    backgroundColor: COLORS.peach,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
  },
  infoHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
  },
  infoDescription: {
    marginTop: 9,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 20,
  },
});

// Người dùng khách cần đăng nhập trước khi truy cập chức năng cá nhân.
export default function ProtectedPage() { return <RequireLogin><ScanScreen/></RequireLogin>; }
