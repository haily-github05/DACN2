import { getAuthUser } from "../lib/auth";
// Trang: Cộng đồng — danh sách bài viết, thích và lưu bài.
import { matchesSearch } from "../lib/search";
import SearchField from "../components/SearchField";
import UserAvatar from "../components/UserAvatar";
import FoodImage from "../components/FoodImage";
import { getPosts, CommunityPost } from "../lib/communityApi";
import { kitchenRequest } from "../lib/kitchenApi";
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Plus,
  Sparkles,
  ChevronRight,
  Share2,
  Users,
  ChefHat,
  ArrowLeft,
} from "lucide-react-native";

import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  white: "#FFFFFF",
};

const categories = [
  "Tất cả",
  "🍲 Món Việt",
  "🥗 Healthy",
  "🍰 Bánh ngọt",
  "⚡ Nấu nhanh",
];

type Post = CommunityPost;

export default function CommunityScreen() {
  const router = useRouter();
  const [initialPosts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    getPosts().then(rows => {
      if (!active) return;
      setPosts(rows); setLiked(rows.filter(p => p.liked).map(p => p.id)); setSaved(rows.filter(p => p.saved).map(p => p.id));
    }).catch(error => Alert.alert("Không thể tải cộng đồng", error.message));
    return () => { active = false; };
  }, []));


  const posts = useMemo(() => {
    return initialPosts.filter((post) => {
      const matchCategory = category === "Tất cả" || post.category === category;

      const matchSearch = matchesSearch(search, post.title, post.author, post.description, post.category);
      return matchCategory && matchSearch;
    });
  }, [search, category, initialPosts]);

  const react = async (id: string, kind: "like" | "save") => {
    if (busy) return;
    if (!await getAuthUser()) { Alert.alert("Vui lòng đăng nhập", "Đăng nhập để thích và lưu bài viết.", [{text:"Để sau",style:"cancel"},{text:"Đăng nhập",onPress:()=>router.push("/login")}]); return; }
    setBusy(true);
    const list = kind === "like" ? liked : saved;
    const active = !list.includes(id);
    try {
      await kitchenRequest(`posts/${id}/reactions`, "PUT", { kind, active });
      const update = (current: string[]) => active ? [...current, id] : current.filter(x => x !== id);
      if (kind === "like") setLiked(update); else setSaved(update);
    } catch (error) { Alert.alert("Không thể lưu", error instanceof Error ? error.message : "Vui lòng thử lại"); }
    finally { setBusy(false); }
  };
  const toggleLike = (id: string) => { void react(id, "like"); };
  const toggleSave = (id: string) => { void react(id, "save"); };

  const openPost = (post: Post) => {
    router.push({
      pathname: "/post-detail",
      params: { id: post.id },
    } as any);
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <AppHeader showNotification />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADING */}
        <View style={styles.heading}>
          <View style={styles.headingLeft}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/home");
                }
              }}
              hitSlop={10}
            >
              <ArrowLeft size={22} color={C.orange} />
            </Pressable>

            <View style={styles.headingText}>
              <Text style={styles.eyebrow}>KHÁM PHÁ & CHIA SẺ</Text>

              <Text style={styles.title}>Cộng đồng ẩm thực</Text>

              <Text style={styles.subtitle}>
                Kết nối qua những món ăn ngon mỗi ngày.
              </Text>
            </View>
          </View>

          <View style={styles.peopleIcon}>
            <Users size={23} color={C.orange} />
          </View>
        </View>

        {/* SEARCH */}
        <SearchField value={search} onChangeText={setSearch} placeholder="Tìm món ngon, người chia sẻ, hashtag..." style={styles.searchBox} inputStyle={styles.searchInput} />

        {/* CATEGORIES */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categories}
        >
          {categories.map((item) => {
            const active = category === item;

            return (
              <Pressable
                key={item}
                style={[styles.categoryChip, active && styles.categoryActive]}
                onPress={() => setCategory(item)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.categoryTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* FEATURED */}
        <View style={styles.featuredCard}>
          <FoodImage
            uri="https://images.unsplash.com/photo-1547592180-85f173990554?w=1000&q=85"
            style={styles.featuredImage}
          />

          <View style={styles.featuredBody}>
            <View style={styles.featuredBadge}>
              <Sparkles size={13} color={C.orange} />
              <Text style={styles.featuredBadgeText}>CẢM HỨNG HÔM NAY</Text>
            </View>

            <Text style={styles.featuredTitle}>
              Mỗi món ăn là một câu chuyện
            </Text>

            <Text style={styles.featuredDescription}>
              Cùng chia sẻ công thức và lưu lại những khoảnh khắc đáng nhớ trong
              bếp.
            </Text>

            <Pressable
              style={styles.featuredAction}
              onPress={() => router.push("/create-post" as any)}
            >
              <Text style={styles.featuredActionText}>Chia sẻ món ngon</Text>

              <ChevronRight size={16} color={C.orange} />
            </Pressable>
          </View>
        </View>

        {/* SECTION */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Bài viết cộng đồng</Text>

            <Text style={styles.sectionSubtitle}>
              Khám phá những chia sẻ mới nhất
            </Text>
          </View>

          <View style={styles.postCount}>
            <Text style={styles.postCountText}>{posts.length} bài</Text>
          </View>
        </View>

        {/* POSTS */}
        {posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <ChefHat size={32} color={C.orange} />
            <Text style={styles.emptyTitle}>Chưa tìm thấy bài viết</Text>
            <Text style={styles.emptyDescription}>
              Thử tìm bằng từ khóa hoặc danh mục khác nhé.
            </Text>
          </View>
        ) : (
          posts.map((post) => {
            const isLiked = liked.includes(post.id);
            const isSaved = saved.includes(post.id);

            return (
              <View key={post.id} style={styles.postCard}>
                {/* AUTHOR */}
                <Pressable
                  style={styles.authorRow}
                  onPress={() => openPost(post)}
                >
                  <UserAvatar uri={post.avatar} initials={post.initials} name={post.author} size={43}/>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.authorName}>{post.author}</Text>

                    <Text style={styles.authorMeta}>
                      {post.time} · {post.category}
                    </Text>
                  </View>

                  <ChevronRight size={18} color={C.muted} />
                </Pressable>

                {/* CONTENT */}
                <Pressable onPress={() => openPost(post)}>
                  <Text style={styles.postTitle}>{post.visibility === "PRIVATE" ? "🔒 " : ""}{post.title}</Text>
                  {post.visibility !== "PRIVATE" && post.moderationStatus !== "APPROVED" && <Text style={styles.postDescription}>{post.moderationStatus === "REJECTED" ? "Bị từ chối" : post.moderationStatus === "HIDDEN" ? "Đã ẩn khỏi cộng đồng" : "Chờ admin duyệt"}</Text>}

                  <Text style={styles.postDescription}>{post.description}</Text>

                  <FoodImage
                    uri={post.image}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                </Pressable>

                {/* ACTIONS */}
                <View style={styles.postActions}>
                  <Pressable
                    style={styles.action}
                    onPress={() => toggleLike(post.id)}
                  >
                    <Heart
                      size={20}
                      color={isLiked ? "#E44836" : C.muted}
                      fill={isLiked ? "#E44836" : "none"}
                    />

                    <Text
                      style={[
                        styles.actionText,
                        isLiked && { color: "#E44836" },
                      ]}
                    >
                      {Math.max(0, post.likes + Number(isLiked) - Number(post.liked))}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.action}
                    onPress={() => openPost(post)}
                  >
                    <MessageCircle size={20} color={C.muted} />

                    <Text style={styles.actionText}>{post.comments}</Text>
                  </Pressable>

                  <Pressable
                    style={styles.action}
                    onPress={() =>
                      Alert.alert(
                        "Chia sẻ bài viết",
                        "Chức năng chia sẻ sẽ được kết nối với dữ liệu bài đăng.",
                      )
                    }
                  >
                    <Share2 size={19} color={C.muted} />
                  </Pressable>

                  <View style={{ flex: 1 }} />

                  <Pressable
                    style={styles.action}
                    onPress={() => toggleSave(post.id)}
                  >
                    <Bookmark
                      size={20}
                      color={isSaved ? C.orange : C.muted}
                      fill={isSaved ? C.peach : "none"}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.endText}>
          ✨ Cảm ơn bạn đã cùng chia sẻ niềm vui nấu ăn!
        </Text>
      </ScrollView>

      {/* FLOATING CREATE BUTTON */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/create-post" as any)}
      >
        <Plus size={23} color={C.white} />
        <Text style={styles.fabText}>Đăng bài</Text>
      </Pressable>

      <BottomNav />
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
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 95,
  },

  heading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  eyebrow: {
    color: C.orange,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 7,
  },

  title: {
    color: C.dark,
    fontSize: 25,
    fontWeight: "800",
  },

  subtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 7,
  },

  peopleIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  searchBox: {
    height: 52,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.dark,
  },

  categoriesScroll: {
    marginTop: 16,
    marginBottom: 20,
    flexGrow: 0,
  },

  categories: {
    gap: 9,
    paddingRight: 10,
  },

  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 30,
  },

  categoryActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },

  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
  },

  categoryTextActive: {
    color: C.white,
  },

  featuredCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },

  featuredImage: {
    width: "100%",
    height: 165,
    backgroundColor: C.peach,
  },

  featuredBody: {
    padding: 17,
  },

  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  featuredBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.orange,
    letterSpacing: 0.6,
  },

  featuredTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.dark,
    marginTop: 10,
  },

  featuredDescription: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 19,
    marginTop: 7,
  },

  featuredAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 13,
  },

  featuredActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.orange,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 27,
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.dark,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 5,
  },

  postCount: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.peach,
  },

  postCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.orange,
  },

  postCard: {
    backgroundColor: C.white,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    padding: 14,
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.peach,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.orange,
  },

  authorName: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },

  authorMeta: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },

  postTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 7,
  },

  postDescription: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 19,
    marginBottom: 13,
  },

  postImage: {
    width: "100%",
    height: 205,
    borderRadius: 13,
    backgroundColor: C.peach,
  },

  postActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 19,
    paddingTop: 15,
  },

  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.muted,
  },

  emptyCard: {
    alignItems: "center",
    padding: 30,
    backgroundColor: C.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
  },

  emptyDescription: {
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 95,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.orange,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
    elevation: 5,
    shadowColor: "#A23A00",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  fabText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
  },

  endText: {
    textAlign: "center",
    color: C.muted,
    fontSize: 11,
    marginTop: 10,
  },

  headingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  headingText: {
    flex: 1,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF1EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EED9CF',
  },

});
