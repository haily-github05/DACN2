import RequireLogin from "../components/RequireLogin";
// Trang: Hoạt động của tôi — món đã nấu, nội dung đã lưu và bài viết của tôi.
import { matchesSearch } from "../lib/search";
import SearchField from "../components/SearchField";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Bookmark, ChefHat, ChevronRight, FileText, Globe, Lock, Plus} from "lucide-react-native";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import FoodImage from "../components/FoodImage";
import { ActivityData, ActivityItem, getActivity } from "../lib/activityApi";
import { kitchenRequest } from "../lib/kitchenApi";

type Tab = "cooked" | "saved" | "shared";
const tabs: { key: Tab; label: string }[] = [
  { key: "cooked", label: "Đã nấu" },
  { key: "saved", label: "Đã lưu" },
  { key: "shared", label: "Bài của tôi" },
];
const C = { orange: "#A23A00", cream: "#FFF8F6", peach: "#FEF1EB", border: "#EED9CF", dark: "#201A17", muted: "#735A51" };
function displayDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN");
}
function MyActivityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: Tab = params.tab === "saved" || params.tab === "shared" ? params.tab : "cooked";
  const [data, setData] = useState<ActivityData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [savedKind, setSavedKind] = useState<"all" | "recipes" | "posts">("all");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const actionLock = useRef(false);
  const generation = useRef(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    const current = generation.current + revision + 1;
    generation.current = current;
    setLoading(true);
    setError("");
    setData(null);
    getActivity().then(result => { if (active && current === generation.current) setData(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "Không thể tải hoạt động"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; generation.current++; };
  }, [revision]));
  const items = useMemo(() => {
    if (!data) return [];
    const source = tab === "cooked" ? data.cooked
      : tab === "saved" ? savedKind === "all" ? [...data.savedRecipes, ...data.savedPosts] : savedKind === "recipes" ? data.savedRecipes : data.savedPosts
      : data.shared.filter(item => item.visibility === visibility);
    return source.filter(item => matchesSearch(search, item.title, item.author, ...(item.history?.map(entry => entry.note) || [])));
  }, [data, tab, savedKind, visibility, search]);
  const selectTab = (next: Tab) => {
    setSearch("");
    router.setParams({ tab: next });
  };
  const openItem = (item: ActivityItem) => {
    if (item.kind === "post") router.push({ pathname: "/post-detail", params: { id: item.id } });
    else router.push({ pathname: "/recipe-detail", params: { id: item.id, name: item.title } });
  };
  const removeSaved = (item: ActivityItem) => {
    Alert.alert("Bỏ lưu?", item.title, [
      { text: "Giữ lại", style: "cancel" },
      { text: "Bỏ lưu", onPress: () => {
        if (actionLock.current) return;
        actionLock.current = true;
        const current = generation.current;
        setBusyId(item.kind + item.id);
        const request = item.kind === "recipe"
          ? kitchenRequest("favorites/" + item.id, "PUT", { saved: false })
          : kitchenRequest("posts/" + item.id + "/reactions", "PUT", { kind: "save", active: false });
        request.then(() => {
          if (current !== generation.current) return;
          setData(prev => prev ? { ...prev, [item.kind === "recipe" ? "savedRecipes" : "savedPosts"]: prev[item.kind === "recipe" ? "savedRecipes" : "savedPosts"].filter(row => row.id !== item.id) } : prev);
        }).catch(err => Alert.alert("Không thể bỏ lưu", err.message))
          .finally(() => { actionLock.current = false; setBusyId(null); });
      } },
    ]);
  };
  const emptyText = search.trim() ? "Không tìm thấy kết quả phù hợp."
    : tab === "cooked" ? "Bạn chưa lưu món đã nấu. Hoàn thành một công thức rồi xác nhận lưu để xem tại đây."
    : tab === "saved" ? savedKind === "all" ? "Bạn chưa lưu công thức hoặc bài viết nào." : savedKind === "recipes" ? "Nhấn trái tim ở công thức để lưu món yêu thích." : "Nhấn Lưu bài viết ở cộng đồng để thêm vào bộ sưu tập."
    : visibility === "PRIVATE" ? "Bạn chưa có bài viết cá nhân." : "Bạn chưa chia sẻ bài viết công khai.";
  return <SafeAreaView style={s.page} edges={["left", "right"]}>
    <AppHeader />
    <View style={s.heading}>
      <Pressable accessibilityLabel="Quay lại Cá nhân" style={s.back} onPress={() => router.canGoBack() ? router.back() : router.replace("/profile")}><ArrowLeft size={22} color={C.orange} /></Pressable>
      <View style={s.flex}><Text style={s.title}>Hoạt động của tôi</Text><Text style={s.muted}>Lưu giữ hành trình vào bếp của bạn</Text></View>
    </View>
    <View style={s.tabs}>{tabs.map(entry => <Pressable key={entry.key} accessibilityRole="tab" accessibilityState={{ selected: tab === entry.key }} onPress={() => selectTab(entry.key)} style={[s.tab, tab === entry.key && s.selectedTab]}><Text style={[s.tabText, tab === entry.key && s.selectedText]}>{entry.label}</Text></Pressable>)}</View>
    {tab !== "cooked" && <View style={s.filters}>
      {(tab === "saved" ? [{ value: "all", label: "Tất cả" }, { value: "recipes", label: "Công thức" }, { value: "posts", label: "Bài viết" }] : [{ value: "PUBLIC", label: "Công khai" }, { value: "PRIVATE", label: "Chỉ mình tôi" }]).map(option =>
        <Pressable key={option.value} style={[s.chip, (tab === "saved" ? savedKind : visibility) === option.value && s.activeChip]}
          onPress={() => { setSearch(""); if (tab === "saved") setSavedKind(option.value as "all" | "recipes" | "posts"); else setVisibility(option.value as "PUBLIC" | "PRIVATE"); }}>
          <Text style={s.chipText}>{option.label}</Text>
        </Pressable>)}
    </View>}
    <SearchField value={search} onChangeText={setSearch} placeholder="Tìm món ăn hoặc bài viết…" style={s.search} inputStyle={s.searchInput} />
    {loading ? <ActivityIndicator color={C.orange} style={s.center} /> : error ? <View style={s.empty}><Text style={s.body}>{error}</Text><Pressable style={s.cta} onPress={() => setRevision(n => n + 1)}><Text style={s.ctaText}>Thử lại</Text></Pressable></View> :
      <FlatList<ActivityItem>
        data={items}
        keyExtractor={item => item.kind + item.id}
        contentContainerStyle={s.list}
        refreshing={loading}
        onRefresh={() => setRevision(n => n + 1)}
        ListHeaderComponent={<Text style={s.count}>{items.length} {tab === "cooked" || (tab === "saved" && savedKind === "recipes") ? "món" : tab === "saved" && savedKind === "all" ? "mục" : "bài viết"}</Text>}
        ListEmptyComponent={<View style={s.empty}>{tab === "cooked" ? <ChefHat size={36} color={C.orange} /> : tab === "saved" ? <Bookmark size={36} color={C.orange} /> : <FileText size={36} color={C.orange} />}<Text style={s.body}>{emptyText}</Text>
          {!search.trim() && <Pressable style={s.cta} onPress={() => router.push(tab === "shared" ? "/create-post" : tab === "saved" && savedKind === "posts" ? "/community" : "/recipes")}><Plus size={17} color="white" /><Text style={s.ctaText}>{tab === "shared" ? "Viết bài đầu tiên" : "Khám phá ngay"}</Text></Pressable>}
        </View>}
        renderItem={({ item }) => <View style={s.card}>
          <Pressable style={s.cardMain} onPress={() => openItem(item)}>
            <FoodImage uri={item.image} style={s.image} resizeMode="cover" />
            <View style={s.flex}><Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
              {item.kind === "recipe" ? <>
                <Text style={s.muted}>{item.minutes} phút · {item.calories ?? "—"} kcal/khẩu phần</Text>
                {tab === "cooked" && <Text style={s.badge}>Đã nấu {item.cookCount} lần · {displayDate(item.cookedAt)}</Text>}
              </> : <>
                <Text style={s.muted} numberOfLines={1}>{item.author} · {displayDate(item.createdAt)}</Text>
                <View style={s.row}>{item.visibility === "PRIVATE" ? <Lock size={12} color={C.orange} /> : <Globe size={12} color={C.orange} />}<Text style={s.badge}>{item.visibility === "PRIVATE" ? "Chỉ mình tôi" : "Công khai"}</Text></View>
              </>}
            </View><ChevronRight size={18} color={C.orange} />
          </Pressable>
          {tab === "cooked" && <View style={{padding:12,gap:12,borderTopWidth:1,borderColor:C.border}}>
            <Pressable onPress={() => setExpanded(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev,item.id])}>
              <Text style={s.chipText}>{expanded.includes(item.id) ? "Ẩn các lượt nấu" : "Xem từng lượt nấu"}</Text>
            </Pressable>
            {expanded.includes(item.id) && item.history?.map(entry => <View key={entry.id} style={{padding:12,backgroundColor:C.cream,borderRadius:10,gap:5}}>
              <Text style={s.cardTitle}>{new Date(entry.cookedAt).toLocaleString("vi-VN")}</Text>
              <Text style={s.muted}>Khẩu phần: {entry.servings} người</Text>
              <Text style={s.muted}>Đánh giá: {entry.rating === null ? "Chưa đánh giá" : `${entry.rating}/5 sao`}</Text>
              <Text style={s.muted}>Ghi chú: {entry.note || "Chưa có ghi chú"}</Text>
              <Text style={s.badge}>{entry.planItemId ? `Từ bữa ăn thực đơn #${entry.planItemId}` : "Nấu trực tiếp từ công thức"}</Text>
            </View>)}
          </View>}
          {tab === "saved" && <Pressable accessibilityLabel={"Bỏ lưu " + item.title} disabled={busyId !== null} onPress={() => removeSaved(item)} style={s.unsave}><Bookmark size={14} color={C.orange} /><Text style={s.chipText}>{busyId === item.kind + item.id ? "Đang bỏ lưu…" : "Bỏ lưu"}</Text></Pressable>}
        </View>}
      />}
    <BottomNav />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  page:{flex:1,backgroundColor:C.cream},flex:{flex:1},heading:{flexDirection:"row",alignItems:"center",gap:12,padding:18},back:{padding:10,backgroundColor:C.peach,borderRadius:12},title:{fontSize:22,fontWeight:"700",color:C.dark},muted:{fontSize:12,color:C.muted,lineHeight:19,marginTop:5},tabs:{flexDirection:"row",marginHorizontal:18,padding:4,backgroundColor:C.peach,borderRadius:14,gap:4},tab:{flex:1,paddingVertical:12,alignItems:"center",borderRadius:11},selectedTab:{backgroundColor:C.orange},tabText:{fontSize:13,fontWeight:"600",color:C.orange},selectedText:{color:"white"},filters:{flexDirection:"row",gap:8,paddingHorizontal:18,paddingTop:14},chip:{paddingHorizontal:14,paddingVertical:9,borderRadius:20,borderWidth:1,borderColor:C.border},activeChip:{backgroundColor:C.peach,borderColor:C.orange},chipText:{fontSize:12,color:C.orange,fontWeight:"600"},search:{flexDirection:"row",alignItems:"center",gap:10,margin:18,paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:"white"},searchInput:{flex:1,paddingVertical:12,color:C.dark,fontSize:14},list:{paddingHorizontal:18,paddingBottom:24,gap:12},count:{fontSize:13,color:C.muted,marginBottom:2},card:{backgroundColor:"white",borderRadius:16,borderWidth:1,borderColor:C.border,overflow:"hidden"},cardMain:{padding:12,flexDirection:"row",alignItems:"center",gap:12},image:{width:80,height:86,borderRadius:12},cardTitle:{fontSize:16,lineHeight:22,fontWeight:"700",color:C.dark},badge:{fontSize:11,color:C.orange,lineHeight:18,marginTop:5},row:{flexDirection:"row",alignItems:"center",gap:5},unsave:{borderTopWidth:1,borderColor:C.border,padding:10,flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:6},center:{margin:40},empty:{padding:24,gap:20,alignItems:"center"},body:{fontSize:15,lineHeight:24,color:C.muted,textAlign:"center"},cta:{paddingVertical:13,paddingHorizontal:18,borderRadius:12,backgroundColor:C.orange,flexDirection:"row",gap:8,alignItems:"center"},ctaText:{color:"white",fontWeight:"600",fontSize:14},
});

// Người dùng khách cần đăng nhập trước khi truy cập chức năng cá nhân.
export default function ProtectedPage() { return <RequireLogin><MyActivityScreen/></RequireLogin>; }
