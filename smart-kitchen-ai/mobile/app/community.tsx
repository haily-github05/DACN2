import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Search,
  Heart,
  MessageCircle,
  Bookmark,
  Plus,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
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

const initialPosts = [
  {
    id: "1",
    author: "Minh Anh",
    initials: "MA",
    time: "2 giờ trước",
    category: "🍲 Món Việt",
    title: "Cơm gà áp chảo – bữa trưa đơn giản",
    description:
      "Chỉ mất 25 phút để có một bữa cơm đủ chất. Thịt gà mềm, rau củ giòn ngọt, cả nhà đều thích! 🍗",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=1000&q=85",
    likes: 128,
    comments: 24,
  },
  {
    id: "2",
    author: "Ngọc Hà",
    initials: "NH",
    time: "5 giờ trước",
    category: "🥗 Healthy",
    title: "Salad rau củ cho ngày bận rộn",
    description:
      "Một chút rau xanh, cà chua và sốt tự làm. Vừa nhẹ bụng vừa dễ chuẩn bị. 🥬",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000&q=85",
    likes: 96,
    comments: 18,
  },
  {
    id: "3",
    author: "Bảo Trân",
    initials: "BT",
    time: "Hôm qua",
    category: "🍰 Bánh ngọt",
    title: "Cuối tuần làm bánh cùng gia đình",
    description:
      "Thành phẩm nhỏ xinh, thơm mùi bơ. Niềm vui đôi khi chỉ là một buổi chiều trong bếp. 🧁",
    image:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1000&q=85",
    likes: 204,
    comments: 32,
  },
];

type Post = (typeof initialPosts)[number];

export default function CommunityScreen() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);

  const posts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return initialPosts.filter((post) => {
      const matchCategory = category === "Tất cả" || post.category === category;

      const matchSearch =
        !keyword ||
        `${post.title} ${post.author} ${post.description}`
          .toLowerCase()
          .includes(keyword);

      return matchCategory && matchSearch;
    });
  }, [search, category]);

  const toggleLike = (id: string) => {
    setLiked((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleSave = (id: string) => {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const openPost = (post: Post) => {
    router.push({
      pathname: "/post-detail",
      params: { id: post.id },
    } as any);
  };

  return (
    <SafeAreaView style={styles.screen} edges={[]}>
      <AppHeader showNotification unreadCount={3} />

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
        <View style={styles.searchBox}>
          <Search size={19} color={C.muted} />

          <TextInput
            style={styles.searchInput}
            placeholder="Tìm món ngon, người chia sẻ..."
            placeholderTextColor="#A18B81"
            value={search}
            onChangeText={setSearch}
          />

          <SlidersHorizontal size={19} color={C.orange} />
        </View>

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
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1547592180-85f173990554?w=1000&q=85",
            }}
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
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{post.initials}</Text>
                  </View>

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
                  <Text style={styles.postTitle}>{post.title}</Text>

                  <Text style={styles.postDescription}>{post.description}</Text>

                  <Image
                    source={{ uri: post.image }}
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
                      {post.likes + (isLiked ? 1 : 0)}
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
