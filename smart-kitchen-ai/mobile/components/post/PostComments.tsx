// Thành phần: Bình luận bài viết từ MySQL, phân trang và xoá bình luận của mình.
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { MessageCircle, Send, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import UserAvatar from "../UserAvatar";
import {
  addPostComment,
  deletePostComment,
  getPostComments,
  PostComment,
} from "../../lib/communityApi";
const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  border: "#EED9CF",
  muted: "#735A51",
  dark: "#201A17",
};
export default function PostComments({
  postId,
  count,
  onCountChange,
  parentId,
  parentAuthor,
  readOnly = false,
}: {
  postId: string;
  count: number;
  onCountChange: (delta: number) => void;
  parentId?: string;
  parentAuthor?: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [openThreads, setOpenThreads] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState(parentAuthor || "");
  const [items, setItems] = useState<PostComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const lock = useRef(false),
    active = useRef(true);
  const load = async (before?: string) => {
    if (lock.current) return;
    lock.current = true;
    setLoading(true);
    setError("");
    try {
      const page = await getPostComments(postId, before, parentId);
      if (active.current) {
        setItems((prev) =>
          before
            ? [
                ...prev,
                ...page.items.filter(
                  (item) => !prev.some((p) => p.id === item.id),
                ),
              ]
            : page.items,
        );
        setHasMore(page.hasMore);
      }
    } catch (err) {
      if (active.current)
        setError(
          err instanceof Error ? err.message : "Không thể tải bình luận",
        );
    } finally {
      lock.current = false;
      if (active.current) setLoading(false);
    }
  };
  useEffect(() => {
    let current = true;
    active.current = true;
    lock.current = true;
    getPostComments(postId, undefined, parentId)
      .then((page) => {
        if (current) {
          setItems(page.items);
          setHasMore(page.hasMore);
        }
      })
      .catch((err) => {
        if (current)
          setError(
            err instanceof Error ? err.message : "Không thể tải bình luận",
          );
      })
      .finally(() => {
        if (current) {
          lock.current = false;
          setLoading(false);
        }
      });
    return () => {
      current = false;
      active.current = false;
    };
  }, [postId, parentId]);
  const send = async () => {
    if (readOnly || lock.current || !content.trim()) return;
    lock.current = true;
    setSending(true);
    setError("");
    try {
      const comment = await addPostComment(postId, content.trim(), parentId);
      if (active.current) {
        setItems((prev) => [comment, ...prev]);
        setContent("");
        onCountChange(1);
      }
    } catch (err) {
      if (active.current)
        setError(
          err instanceof Error ? err.message : "Không thể gửi bình luận",
        );
    } finally {
      lock.current = false;
      if (active.current) setSending(false);
    }
  };
  const remove = async () => {
    if (lock.current || !deleting) return;
    lock.current = true;
    setSending(true);
    setError("");
    try {
      const result = await deletePostComment(postId, deleting);
      if (active.current) {
        setItems((prev) => prev.filter((item) => item.id !== deleting));
        onCountChange(-result.deletedCount);
        setDeleting(null);
      }
    } catch (err) {
      if (active.current) {
        setError(
          err instanceof Error ? err.message : "Không thể xoá bình luận",
        );
        setDeleting(null);
      }
    } finally {
      lock.current = false;
      if (active.current) setSending(false);
    }
  };
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <MessageCircle size={20} color={C.orange} />
        <Text style={s.heading}>
          {parentId ? "Trả lời bình luận" : `Bình luận (${count})`}
        </Text>
      </View>
      {readOnly ? (
        <Pressable style={s.composer} onPress={() => router.push("/login")}>
          <Text style={s.accent}>
            Vui lòng đăng nhập để bình luận và trả lời
          </Text>
        </Pressable>
      ) : (
        <View style={s.composer}>
          {parentId && <Text style={s.accent}>Đang trả lời {replyTo}</Text>}
          <TextInput
            ref={input}
            accessibilityLabel="Nội dung bình luận"
            multiline
            maxLength={2000}
            value={content}
            onChangeText={setContent}
            editable={!sending}
            placeholder="Chia sẻ cảm nhận hoặc hỏi tác giả…"
            placeholderTextColor={C.muted}
            style={s.input}
          />
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.small}>{content.length}/2000</Text>
            <Pressable
              disabled={sending || loading || !content.trim()}
              onPress={() => void send()}
              style={[
                s.button,
                (sending || loading || !content.trim()) && { opacity: 0.4 },
              ]}
            >
              <Send size={15} color="white" />
              <Text style={s.white}>
                {sending
                  ? "Đang xử lý…"
                  : parentId
                    ? "Gửi trả lời"
                    : "Gửi bình luận"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {items.map((item) => (
        <View key={item.id} style={{ gap: 10 }}>
          <View style={s.comment}>
            <UserAvatar
              uri={item.avatar}
              initials={item.initials}
              name={item.author}
              size={34}
            />
            <View style={{ flex: 1, gap: 7 }}>
              <Text style={s.author}>{item.author}</Text>
              <Text style={s.body}>{item.content}</Text>
              <View style={[s.row, { flexWrap: "wrap" }]}>
                <Text style={s.small}>
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </Text>
                <Pressable
                  disabled={sending || loading}
                  style={{ padding: 7 }}
                  onPress={() => {
                    if (parentId && readOnly) {
                      router.push("/login");
                      return;
                    }
                    if (parentId) {
                      setReplyTo(item.author);
                      input.current?.focus();
                    } else
                      setOpenThreads((prev) =>
                        prev.includes(item.id)
                          ? prev.filter((id) => id !== item.id)
                          : [...prev, item.id],
                      );
                  }}
                >
                  <Text style={s.accent}>
                    {!parentId && openThreads.includes(item.id)
                      ? "Ẩn trả lời"
                      : `Trả lời${!parentId && item.replyCount ? ` (${item.replyCount})` : ""}`}
                  </Text>
                </Pressable>
                {item.isOwner && (
                  <Pressable
                    disabled={sending || loading}
                    accessibilityLabel="Xoá bình luận của tôi"
                    onPress={() => setDeleting(item.id)}
                    style={{ padding: 7, marginLeft: "auto" }}
                  >
                    <Trash2 size={15} color={C.orange} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
          {!parentId && openThreads.includes(item.id) && (
            <View style={s.thread}>
              <PostComments
                readOnly={readOnly}
                postId={postId}
                parentId={item.id}
                parentAuthor={item.author}
                count={item.replyCount || 0}
                onCountChange={(delta) => {
                  setItems((prev) =>
                    prev.map((row) =>
                      row.id === item.id
                        ? {
                            ...row,
                            replyCount: Math.max(
                              0,
                              (row.replyCount || 0) + delta,
                            ),
                          }
                        : row,
                    ),
                  );
                  onCountChange(delta);
                }}
              />
            </View>
          )}
        </View>
      ))}
      {loading ? (
        <ActivityIndicator color={C.orange} />
      ) : error ? (
        <Pressable onPress={() => void load(items.at(-1)?.id)}>
          <Text style={s.accent}>Tải lại bình luận</Text>
        </Pressable>
      ) : hasMore ? (
        <Pressable onPress={() => void load(items.at(-1)?.id)} style={s.more}>
          <Text style={s.accent}>Xem thêm bình luận</Text>
        </Pressable>
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <MessageCircle size={26} color={C.border} />
          <Text style={s.body}>
            Chưa có bình luận. Hãy là người đầu tiên chia sẻ!
          </Text>
        </View>
      ) : null}
      <Modal
        visible={deleting !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!sending) setDeleting(null);
        }}
      >
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.heading}>Xoá bình luận của bạn?</Text>
            <Text style={s.body}>
              Bình luận và các câu trả lời bên dưới sẽ bị xoá, không thể khôi
              phục.
            </Text>
            <View style={[s.row, { justifyContent: "flex-end" }]}>
              <Pressable
                disabled={sending}
                onPress={() => setDeleting(null)}
                style={s.more}
              >
                <Text style={s.accent}>Huỷ</Text>
              </Pressable>
              <Pressable
                disabled={sending}
                onPress={() => void remove()}
                style={s.button}
              >
                <Text style={s.white}>{sending ? "Đang xoá…" : "Xoá"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  thread: {
    marginLeft: 16,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
  },
  wrap: { gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { fontSize: 16, fontWeight: "700", color: C.dark },
  composer: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 10,
  },
  input: {
    minHeight: 70,
    textAlignVertical: "top",
    fontSize: 14,
    lineHeight: 22,
    color: C.dark,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.orange,
    padding: 11,
    borderRadius: 10,
  },
  white: { fontSize: 12, fontWeight: "700", color: "white" },
  small: { fontSize: 10, color: C.muted },
  comment: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 15,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: C.border,
  },
  author: { fontSize: 13, fontWeight: "700", color: C.dark },
  body: { fontSize: 13, lineHeight: 21, color: C.muted },
  accent: { fontSize: 13, fontWeight: "700", color: C.orange },
  error: { color: "#B42318", fontSize: 13 },
  empty: { alignItems: "center", gap: 10, padding: 20 },
  more: { padding: 12, alignItems: "center" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(32,26,23,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    padding: 22,
    borderRadius: 18,
    gap: 18,
  },
});
