
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bot,
  X,
  Send,
  Sparkles,
  CalendarDays,
  ChefHat,
  ShoppingCart,
  Refrigerator,
  UtensilsCrossed,
  ArrowRight,
  RotateCcw,
} from 'lucide-react-native';

const C = {
  orange: '#A23A00',
  deep: '#842D00',
  cream: '#FFF8F6',
  peach: '#FEF1EB',
  white: '#FFFFFF',
  dark: '#201A17',
  muted: '#735A51',
  border: '#EED9CF',
  green: '#397C57',
  mint: '#E9F5EB',
};

type ActionType = 'recipes' | 'meal-plan' | 'shopping-list' | 'pantry';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  action?: ActionType;
  actionLabel?: string;
};

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Xin chào! 👋 Mình là Smart Kitchen AI.\n\nMình có thể giúp bạn chọn món ăn, lên thực đơn, quản lý nguyên liệu, chuẩn bị danh sách mua sắm và hướng dẫn nấu ăn.\n\nHôm nay bạn cần mình giúp gì?',
};

const SUGGESTIONS = [
  {
    id: 'meal',
    label: 'Lập thực đơn 7 ngày',
    question: 'Lập thực đơn 7 ngày cho 2 người',
    icon: CalendarDays,
  },
  {
    id: 'recipes',
    label: 'Hôm nay nấu món gì?',
    question: 'Hôm nay tôi nên nấu món gì?',
    icon: ChefHat,
  },
  {
    id: 'pantry',
    label: 'Món từ nguyên liệu có sẵn',
    question: 'Gợi ý món ăn từ nguyên liệu trong tủ lạnh',
    icon: Refrigerator,
  },
  {
    id: 'shopping',
    label: 'Lập danh sách mua sắm',
    question: 'Tạo danh sách nguyên liệu cần mua',
    icon: ShoppingCart,
  },
  {
    id: 'cooking',
    label: 'Hướng dẫn nấu ăn',
    question: 'Hướng dẫn tôi nấu món ăn từng bước',
    icon: UtensilsCrossed,
  },
];

function getLocalResponse(question: string): {
  content: string;
  action?: ActionType;
  actionLabel?: string;
} {
  const q = question.toLocaleLowerCase('vi-VN');

  if (
    q.includes('thực đơn') ||
    q.includes('7 ngày') ||
    q.includes('3 ngày') ||
    q.includes('kế hoạch ăn')
  ) {
    return {
      content:
        '📅 Mình gợi ý thực đơn mẫu 3 ngày cho bạn:\n\n' +
        'Ngày 1\n' +
        '• Sáng: Bánh mì trứng\n' +
        '• Trưa: Ức gà áp chảo\n' +
        '• Tối: Salad rau củ\n\n' +
        'Ngày 2\n' +
        '• Sáng: Trứng cuộn rau củ\n' +
        '• Trưa: Cơm chiên trứng\n' +
        '• Tối: Mì Ý sốt cà chua\n\n' +
        'Ngày 3\n' +
        '• Sáng: Bánh mì trứng\n' +
        '• Trưa: Ức gà áp chảo\n' +
        '• Tối: Salad rau củ\n\n' +
        'Đây là thực đơn minh họa. Bạn có thể mở trang Thực đơn để sắp xếp bữa ăn theo từng ngày.',
      action: 'meal-plan',
      actionLabel: 'Mở trang thực đơn',
    };
  }

  if (
    q.includes('tủ lạnh') ||
    q.includes('nguyên liệu có sẵn') ||
    q.includes('trong kho') ||
    q.includes('còn gì')
  ) {
    return {
      content:
        '🥦 Để chọn món từ nguyên liệu hiện có, bạn hãy kiểm tra Kho thực phẩm.\n\n' +
        'Một số cách kết hợp phổ biến:\n' +
        '• Trứng + cà rốt → Trứng cuộn rau củ\n' +
        '• Ức gà + tỏi → Gà áp chảo\n' +
        '• Cơm + trứng → Cơm chiên trứng\n\n' +
        'Hiện tại mình chưa tự đọc dữ liệu Kho thực phẩm, nên đây là gợi ý tham khảo.',
      action: 'pantry',
      actionLabel: 'Xem kho thực phẩm',
    };
  }

  if (
    q.includes('mua sắm') ||
    q.includes('đi chợ') ||
    q.includes('cần mua') ||
    q.includes('thiếu nguyên liệu')
  ) {
    return {
      content:
        '🛒 Mình có thể hỗ trợ bạn chuẩn bị danh sách mua sắm.\n\n' +
        'Bạn nên kiểm tra:\n' +
        '• Nguyên liệu đang thiếu\n' +
        '• Số lượng cần cho từng món\n' +
        '• Nguyên liệu đã có trong kho\n\n' +
        'Hãy mở Danh sách mua sắm để thêm và đánh dấu các món đã mua.',
      action: 'shopping-list',
      actionLabel: 'Mở danh sách mua sắm',
    };
  }

  if (
    q.includes('nấu món') ||
    q.includes('món gì') ||
    q.includes('gợi ý món') ||
    q.includes('ăn gì') ||
    q.includes('công thức')
  ) {
    return {
      content:
        '🍳 Một vài món dễ làm mình gợi ý:\n\n' +
        '1. Trứng cuộn rau củ – khoảng 10 phút\n' +
        '2. Cơm chiên trứng – khoảng 15 phút\n' +
        '3. Ức gà áp chảo – khoảng 25 phút\n' +
        '4. Salad rau củ – khoảng 12 phút\n\n' +
        'Bạn có thể xem công thức và chọn món phù hợp trong trang Gợi ý món ăn.',
      action: 'recipes',
      actionLabel: 'Xem công thức món ăn',
    };
  }

  if (
    q.includes('hướng dẫn') ||
    q.includes('từng bước') ||
    q.includes('chế biến') ||
    q.includes('cách làm')
  ) {
    return {
      content:
        '👨‍🍳 Mình sẽ giúp bạn nấu ăn từng bước!\n\n' +
        'Bạn hãy chọn một công thức trong trang Gợi ý món ăn, sau đó nhấn "Bắt đầu nấu ăn" ở trang Chi tiết công thức.\n\n' +
        'Bạn có thể theo dõi và đánh dấu các bước đã hoàn thành.',
      action: 'recipes',
      actionLabel: 'Chọn món để nấu',
    };
  }

  if (
    q.includes('calo') ||
    q.includes('dinh dưỡng') ||
    q.includes('giảm cân') ||
    q.includes('healthy')
  ) {
    return {
      content:
        '🥗 Để xây dựng bữa ăn cân đối, bạn có thể kết hợp:\n\n' +
        '• Chất đạm: thịt, cá, trứng hoặc đậu\n' +
        '• Rau củ và trái cây\n' +
        '• Tinh bột phù hợp\n' +
        '• Chất béo lành mạnh\n\n' +
        'Nhu cầu dinh dưỡng thay đổi theo từng người. Thông tin calo trong công thức hiện chỉ là ước tính minh họa.',
      action: 'recipes',
      actionLabel: 'Xem các món ăn',
    };
  }

  return {
    content:
      'Mình có thể giúp bạn với những việc sau:\n\n' +
      '🍳 Gợi ý món ăn và công thức\n' +
      '📅 Lập thực đơn theo ngày\n' +
      '🥦 Tư vấn sử dụng nguyên liệu\n' +
      '🛒 Chuẩn bị danh sách mua sắm\n' +
      '👨‍🍳 Hướng dẫn nấu ăn\n\n' +
      'Bạn hãy thử hỏi: "Hôm nay nấu món gì?" hoặc "Lập thực đơn 7 ngày cho 2 người".',
  };
}

export default function FloatingAIAssistant() {
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    WELCOME,
  ]);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      const timeout = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [messages, visible]);

  const sendMessage = (value?: string) => {
    const question = (value ?? input).trim();

    if (!question || loading) return;

    Keyboard.dismiss();
    setInput('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    };

    const response = getLocalResponse(question);

    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response.content,
      action: response.action,
      actionLabel: response.actionLabel,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
      assistantMessage,
    ]);
  };

  const navigateTo = (action: ActionType) => {
    setVisible(false);
    Keyboard.dismiss();

    const paths: Record<ActionType, string> = {
      recipes: '/recipes',
      'meal-plan': '/meal-plan',
      'shopping-list': '/shopping-list',
      pantry: '/pantry',
    };

    router.push(paths[action] as any);
  };

  const resetChat = () => {
    setMessages([WELCOME]);
    setInput('');
  };

  return (
    <>
      {/* NÚT ROBOT NỔI */}
      <Pressable
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Mở trợ lý Smart Kitchen AI"
      >
        <Bot size={29} color={C.white} strokeWidth={2.2} />

        <View style={styles.sparkleBadge}>
          <Sparkles size={12} color={C.orange} />
        </View>
      </Pressable>

      {/* CỬA SỔ TRỢ LÝ AI */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              Keyboard.dismiss();
              setVisible(false);
            }}
          />

          <View style={styles.chatPanel}>
            {/* HEADER CHAT */}
            <View style={styles.chatHeader}>
              <View style={styles.avatar}>
                <Bot size={24} color={C.orange} />
              </View>

              <View style={styles.headerInfo}>
                <Text style={styles.chatTitle}>
                  Smart Kitchen AI
                </Text>

                <Text style={styles.chatSubtitle}>
                  Trợ lý nấu ăn của bạn
                </Text>
              </View>

              <Pressable
                style={styles.headerButton}
                onPress={resetChat}
              >
                <RotateCcw size={18} color={C.white} />
              </Pressable>

              <Pressable
                style={styles.headerButton}
                onPress={() => setVisible(false)}
              >
                <X size={21} color={C.white} />
              </Pressable>
            </View>

            {/* TIN NHẮN */}
            <ScrollView
              ref={scrollRef}
              style={styles.chatBody}
              contentContainerStyle={styles.chatContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() =>
                scrollRef.current?.scrollToEnd({
                  animated: true,
                })
              }
            >
              {messages.map((message) => {
                const isUser = message.role === 'user';

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageWrapper,
                      isUser
                        ? styles.userWrapper
                        : styles.assistantWrapper,
                    ]}
                  >
                    {!isUser && (
                      <View style={styles.smallAvatar}>
                        <Bot size={15} color={C.orange} />
                      </View>
                    )}

                    <View
                      style={[
                        styles.messageBubble,
                        isUser
                          ? styles.userBubble
                          : styles.assistantBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isUser && styles.userText,
                        ]}
                      >
                        {message.content}
                      </Text>

                      {message.action && (
                        <Pressable
                          style={styles.actionButton}
                          onPress={() =>
                            navigateTo(message.action!)
                          }
                        >
                          <Text style={styles.actionText}>
                            {message.actionLabel}
                          </Text>

                          <ArrowRight
                            size={15}
                            color={C.orange}
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}

              {loading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator
                    size="small"
                    color={C.orange}
                  />
                  <Text style={styles.loadingText}>
                    Đang suy nghĩ...
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* CÂU HỎI GỢI Ý */}
            <View style={styles.suggestionsSection}>
              <View style={styles.suggestionsHeading}>
                <Sparkles size={14} color={C.orange} />

                <Text style={styles.suggestionsTitle}>
                  Bạn có thể hỏi
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.suggestionsRow}
              >
                {SUGGESTIONS.map((suggestion) => {
                  const Icon = suggestion.icon;

                  return (
                    <Pressable
                      key={suggestion.id}
                      style={styles.suggestionChip}
                      onPress={() =>
                        sendMessage(suggestion.question)
                      }
                    >
                      <Icon size={15} color={C.orange} />

                      <Text style={styles.suggestionText}>
                        {suggestion.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Ô NHẬP CHAT */}
            <View style={styles.inputArea}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Hỏi trợ lý AI..."
                placeholderTextColor="#A18B81"
                style={styles.input}
                multiline
                maxLength={1000}
                onSubmitEditing={() => sendMessage()}
                blurOnSubmit
              />

              <Pressable
                style={[
                  styles.sendButton,
                  !input.trim() && styles.sendButtonDisabled,
                ]}
                disabled={!input.trim() || loading}
                onPress={() => sendMessage()}
              >
                <Send size={19} color={C.white} />
              </Pressable>
            </View>

            <Text style={styles.disclaimer}>
              Gợi ý hiện là dữ liệu mẫu, chưa kết nối AI trực tuyến.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 85,
    right: 18,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.orange,
    borderWidth: 3,
    borderColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    elevation: 12,
    shadowColor: '#50200D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
  },
  sparkleBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.peach,
    borderWidth: 2,
    borderColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(25, 15, 10, 0.48)',
  },
  chatPanel: {
    height: '79%',
    maxHeight: 700,
    backgroundColor: C.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
  },
  chatHeader: {
    backgroundColor: C.orange,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  chatTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
  },
  chatSubtitle: {
    color: '#FFE8DC',
    fontSize: 11,
    marginTop: 4,
  },
  headerButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBody: {
    flex: 1,
  },
  chatContent: {
    padding: 13,
    gap: 14,
    paddingBottom: 22,
  },
  messageWrapper: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  smallAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.peach,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  assistantBubble: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: C.orange,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 19,
    color: C.dark,
  },
  userText: {
    color: C.white,
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: C.peach,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: C.orange,
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 34,
  },
  loadingText: {
    fontSize: 11,
    color: C.muted,
  },
  suggestionsSection: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 11,
    paddingBottom: 12,
  },
  suggestionsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: C.dark,
  },
  suggestionsRow: {
    paddingHorizontal: 13,
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.peach,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.orange,
  },
  inputArea: {
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 43,
    maxHeight: 95,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 12,
    color: C.dark,
  },
  sendButton: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  disclaimer: {
    backgroundColor: C.white,
    textAlign: 'center',
    fontSize: 9,
    color: C.muted,
    paddingVertical: 8,
  },
});
