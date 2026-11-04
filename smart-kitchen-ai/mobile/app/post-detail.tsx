// Trang: Chi tiết bài viết cộng đồng, công thức chia sẻ và tương tác thích/lưu.
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Bookmark,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Globe,
  Heart,
  LockKeyhole,
  MessageCircle,
  Share2,
  Trash2,
  UtensilsCrossed,
} from "lucide-react-native";
import UserAvatar from "../components/UserAvatar";
import FoodImage from "../components/FoodImage";
import AppHeader from "../components/AppHeader";
import { CommunityPost, deletePost, getPosts } from "../lib/communityApi";
import { kitchenRequest } from "../lib/kitchenApi";
import { parsePostContent } from "../lib/postContent";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  white: "#FFFFFF",
};
const titles: Record<string, string> = {
  "THÔNG TIN MÓN": "Thông tin món ăn",
  "DINH DƯỠNG ƯỚC TÍNH / KHẨU PHẦN": "Dinh dưỡng ước tính / khẩu phần",
  "NGUYÊN LIỆU": "Nguyên liệu chuẩn bị",
  "CÁCH LÀM": "Hướng dẫn thực hiện",
  "MẸO NHỎ": "Mẹo nhỏ từ tác giả",
};
function postedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const detailsY = useRef(0);
  const reactionLock = useRef(false);
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setPost(null);
      setError("");
      setExpanded(true);
      getPosts(id)
        .then((rows) => {
          const found = rows.find((p) => p.id === id);
          if (!found)
            throw new Error(
              "Bài viết không tồn tại hoặc bạn không có quyền xem.",
            );
          if (active) setPost(found);
        })
        .catch((err) => {
          if (active)
            setError(
              err instanceof Error ? err.message : "Không thể tải bài viết.",
            );
        });
      return () => {
        active = false;
      };
    }, [id, revision]),
  );
  const react = async (kind: "like" | "save") => {
    if (!post || reactionLock.current) return;
    reactionLock.current = true;
    setBusy(true);
    const active = !(kind === "like" ? post.liked : post.saved);
    try {
      await kitchenRequest(`posts/${post.id}/reactions`, "PUT", {
        kind,
        active,
      });
      setPost((prev) =>
        prev?.id === post.id
          ? {
              ...prev,
              ...(kind === "like"
                ? {
                    liked: active,
                    likes: Math.max(0, prev.likes + (active ? 1 : -1)),
                  }
                : { saved: active }),
            }
          : prev,
      );
    } catch (err) {
      Alert.alert(
        "Không thể cập nhật",
        err instanceof Error ? err.message : "Vui lòng thử lại.",
      );
    } finally {
      reactionLock.current = false;
      setBusy(false);
    }
  };
  const removePost = async () => {
    if (!post?.isOwner || reactionLock.current) return;
    reactionLock.current = true;
    setBusy(true);
    try {
      await deletePost(post.id);
      setConfirmDelete(false);
      router.replace("/community");
    } catch (err) {
      setConfirmDelete(false);
      Alert.alert(
        "Không thể xoá bài",
        err instanceof Error ? err.message : "Vui lòng thử lại.",
      );
    } finally {
      reactionLock.current = false;
      setBusy(false);
    }
  };
  const sharePost = async () => {
    if (!post) return;
    if (post.visibility === "PRIVATE") {
      Alert.alert("Bài viết cá nhân", "Bài viết này chỉ hiển thị với bạn.");
      return;
    }
    try {
      await Share.share({
        title: post.title,
        message: `${post.title}\n${post.author} · Smart Kitchen AI\n\n${post.description}`,
      });
    } catch {
      Alert.alert("Không thể chia sẻ", "Vui lòng thử lại.");
    }
  };
  const content = parsePostContent(post?.description || "");
  const privatePost = post?.visibility === "PRIVATE";
  return (
    <SafeAreaView style={s.page} edges={[]}>
      <AppHeader />
      <View style={s.toolbar}>
        <Pressable
          accessibilityLabel="Quay lại"
          style={s.iconButton}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/community")
          }
        >
          <ArrowLeft size={21} color={C.orange} />
        </Pressable>
        <Text style={s.toolbarTitle}>Bài viết</Text>
        <Pressable
          accessibilityLabel={post?.saved ? "Bỏ lưu bài viết" : "Lưu bài viết"}
          accessibilityState={{ selected: !!post?.saved }}
          disabled={!post || busy}
          style={[s.iconButton, post?.saved && s.selected]}
          onPress={() => void react("save")}
        >
          <Bookmark
            size={20}
            color={C.orange}
            fill={post?.saved ? C.orange : "transparent"}
          />
        </Pressable>
        {!privatePost && (
          <Pressable
            accessibilityLabel="Chia sẻ bài viết"
            disabled={!post}
            style={s.iconButton}
            onPress={() => void sharePost()}
          >
            <Share2 size={20} color={C.orange} />
          </Pressable>
        )}
      </View>
      <Modal
        visible={confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirmDelete(false);
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Trash2 size={28} color={C.orange} />
            <Text style={s.modalTitle}>Xoá bài viết của bạn?</Text>
            <Text style={s.body}>
              Bài “{post?.title}” và các lượt thích, lưu sẽ bị xoá. Bạn không
              thể khôi phục sau khi xoá.
            </Text>
            <View style={s.modalActions}>
              <Pressable
                disabled={busy}
                style={s.pill}
                onPress={() => setConfirmDelete(false)}
              >
                <Text style={s.accent}>Huỷ</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                style={[s.pill, { backgroundColor: C.orange }]}
                onPress={() => void removePost()}
              >
                <Text style={[s.accent, { color: C.white }]}>
                  {busy ? "Đang xoá…" : "Xoá bài viết"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView
        ref={scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {!post ? (
          <View style={s.state}>
            {error ? (
              <>
                <ChefHat size={36} color={C.orange} />
                <Text style={s.body}>{error}</Text>
                <Pressable
                  style={s.pill}
                  onPress={() => setRevision((n) => n + 1)}
                >
                  <Text style={s.accent}>Thử lại</Text>
                </Pressable>
              </>
            ) : (
              <>
                <ActivityIndicator color={C.orange} />
                <Text style={s.muted}>Đang tải bài viết…</Text>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={s.authorRow}>
              <UserAvatar
                uri={post.avatar}
                initials={post.initials}
                name={post.author}
              />
              <View style={s.authorInfo}>
                <Text style={s.author}>{post.author}</Text>
                <View style={s.meta}>
                  {privatePost ? (
                    <LockKeyhole size={12} color={C.muted} />
                  ) : (
                    <Globe size={12} color={C.muted} />
                  )}
                  <Text style={s.small}>
                    {postedAt(post.time)} ·{" "}
                    {privatePost ? "Chỉ mình tôi" : "Công khai"}
                  </Text>
                </View>
              </View>
              <View style={s.category}>
                <ChefHat size={12} color={C.orange} />
                <Text style={s.categoryText}>{post.category}</Text>
              </View>
            </View>
            {post.isOwner && (
              <Pressable
                disabled={busy}
                accessibilityLabel="Xoá bài viết của tôi"
                style={s.deleteButton}
                onPress={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} color={C.orange} />
                <Text style={s.accent}>Xoá bài viết</Text>
              </Pressable>
            )}
            <Text style={s.title}>{post.title}</Text>
            {!!content.intro && <Text style={s.body}>{content.intro}</Text>}
            {!!content.tags.length && (
              <View style={s.tags}>
                {content.tags.map((tag) => (
                  <View key={tag} style={s.tag}>
                    <Text style={s.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            {!!post.image && (
              <View style={s.hero}>
                <FoodImage
                  uri={post.image}
                  style={s.photo}
                  resizeMode="cover"
                  accessibilityLabel={post.title}
                />
                <View style={s.photoBadge}>
                  <UtensilsCrossed size={13} color={C.orange} />
                  <Text style={s.categoryText}>Góc bếp cộng đồng</Text>
                </View>
                {!!content.sections.length && (
                  <Pressable
                    style={s.recipeLink}
                    onPress={() => {
                      setExpanded(true);
                      scroll.current?.scrollTo({
                        y: detailsY.current,
                        animated: true,
                      });
                    }}
                  >
                    <View style={s.recipeIcon}>
                      <ChefHat size={22} color={C.orange} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.recipeLinkTitle}>
                        Cùng vào bếp với {post.author}
                      </Text>
                      <Text style={s.small}>Xem nguyên liệu và cách làm</Text>
                    </View>
                    <ChevronDown size={19} color={C.orange} />
                  </Pressable>
                )}
              </View>
            )}
            <View style={s.reactions}>
              <Pressable
                disabled={busy}
                accessibilityLabel={post.liked ? "Bỏ thích" : "Thích bài viết"}
                accessibilityState={{ selected: post.liked }}
                onPress={() => void react("like")}
                style={[s.reaction, post.liked && s.selected]}
              >
                <Heart
                  size={20}
                  color={C.orange}
                  fill={post.liked ? C.orange : "transparent"}
                />
                <Text style={s.accent}>{post.likes}</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => void react("save")}
                style={[s.reaction, post.saved && s.selected]}
              >
                <Bookmark
                  size={19}
                  color={C.orange}
                  fill={post.saved ? C.orange : "transparent"}
                />
                <Text style={s.accent}>
                  {post.saved ? "Đã lưu" : "Lưu bài"}
                </Text>
              </Pressable>
              {!privatePost && (
                <Pressable
                  accessibilityLabel="Chia sẻ bài viết"
                  onPress={() => void sharePost()}
                  style={[s.reaction, { marginLeft: "auto" }]}
                >
                  <Share2 size={19} color={C.orange} />
                </Pressable>
              )}
            </View>
            {!!content.sections.length && (
              <View
                onLayout={(event) => {
                  detailsY.current = event.nativeEvent.layout.y;
                }}
                style={s.details}
              >
                <Pressable
                  style={s.detailsHeading}
                  onPress={() => setExpanded((value) => !value)}
                >
                  <ChefHat size={21} color={C.orange} />
                  <Text style={s.sectionTitle}>Công thức từ tác giả</Text>
                  {expanded ? (
                    <ChevronUp size={19} color={C.orange} />
                  ) : (
                    <ChevronDown size={19} color={C.orange} />
                  )}
                </Pressable>
                {expanded &&
                  content.sections.map((section, index) => (
                    <View key={`${section.title}-${index}`} style={s.section}>
                      <Text style={s.sectionLabel}>
                        {titles[section.title] || section.title}
                      </Text>
                      <Text style={s.body}>{section.body}</Text>
                    </View>
                  ))}
              </View>
            )}
            <View style={s.comments}>
              <View style={s.detailsHeading}>
                <MessageCircle size={20} color={C.orange} />
                <Text style={s.sectionTitle}>Bình luận</Text>
              </View>
              <View style={s.commentEmpty}>
                <MessageCircle size={28} color={C.border} />
                <Text style={s.emptyTitle}>Tính năng bình luận sắp có</Text>
                <Text style={s.emptyText}>
                  Bạn có thể thả tim hoặc lưu lại công thức yêu thích.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  deleteButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: C.peach,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(32,26,23,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.white,
    padding: 24,
    borderRadius: 20,
    gap: 18,
    width: "100%",
    maxWidth: 420,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: C.dark },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  page: { flex: 1, backgroundColor: C.cream },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  toolbarTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: C.dark },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  selected: { backgroundColor: C.peach },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 28,
    maxWidth: 650,
    width: "100%",
    alignSelf: "center",
  },
  state: { paddingVertical: 70, alignItems: "center", gap: 18 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.peach,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 15, fontWeight: "800", color: C.orange },
  authorInfo: { flex: 1 },
  author: { fontSize: 14, fontWeight: "700", color: C.dark },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  small: { fontSize: 11, color: C.muted, lineHeight: 17, flexShrink: 1 },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.peach,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    maxWidth: "35%",
  },
  categoryText: {
    fontSize: 10,
    color: C.orange,
    fontWeight: "700",
    flexShrink: 1,
  },
  title: { fontSize: 22, lineHeight: 30, fontWeight: "800", color: C.dark },
  body: { fontSize: 14, lineHeight: 23, color: C.muted },
  muted: { color: C.muted },
  accent: { fontSize: 13, fontWeight: "700", color: C.orange },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: {
    borderRadius: 9,
    backgroundColor: C.peach,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: C.orange },
  hero: { borderRadius: 18, overflow: "hidden", backgroundColor: C.peach },
  photo: { width: "100%", aspectRatio: 0.95 },
  photoBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 12,
    backgroundColor: C.white,
  },
  recipeLink: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: C.white,
    borderRadius: 13,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  recipeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeLinkTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 3,
  },
  reactions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  reaction: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  details: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    padding: 16,
    gap: 18,
  },
  detailsHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: C.dark },
  section: { gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: C.orange },
  comments: { gap: 18, marginTop: 4 },
  commentEmpty: {
    padding: 22,
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: C.dark },
  emptyText: {
    fontSize: 12,
    lineHeight: 19,
    color: C.muted,
    textAlign: "center",
  },
  pill: { padding: 12, backgroundColor: C.peach, borderRadius: 12 },
});
