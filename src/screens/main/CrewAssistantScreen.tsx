import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { useFocusEffect } from "@react-navigation/native";

// =============================================================================
// TYPES
// =============================================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatResponse {
  response: string;
  success: boolean;
  action?: string;
  data?: any;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CrewAssistantScreen() {
  const { t } = useLanguageStore();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0 && user) {
      const firstName = user.name?.split(" ")[0] || "";
      const greeting: Message = {
        id: "welcome",
        role: "assistant",
        content: `Olá${firstName ? ", " + firstName : ""}! 👋\n\nSou o assistente CREW. Posso ajudar com:\n\n• Registrar horas de trabalho\n• Consultar projetos e funcionários\n• Gerar relatórios\n• Gerenciar despesas\n• Consultar inventário\n• Informações sobre payroll\n\nComo posso ajudar?`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [user]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message to backend
    const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    // Add user message + loading indicator
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputText("");
    setIsProcessing(true);

    try {
      // Build conversation history (last 10 messages for context)
      const history = messages
        .filter((m) => m.id !== "welcome" && !m.isLoading)
        .slice(-10)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const result = await apiClient.post<ChatResponse>(
        "voiceAssistant.textQuery",
        {
          text,
          conversationHistory: history,
        }
      );

      // Remove loading message and add real response
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.isLoading);
        const assistantMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content:
            result.ok && result.data?.response
              ? result.data.response
              : "Desculpe, ocorreu um erro. Tente novamente.",
          timestamp: new Date(),
        };
        return [...withoutLoading, assistantMessage];
      });
    } catch (error) {
      // Remove loading and show error
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.isLoading);
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: "Erro de conexão. Verifique sua internet e tente novamente.",
          timestamp: new Date(),
        };
        return [...withoutLoading, errorMessage];
      });
    } finally {
      setIsProcessing(false);
      // Refocus input after response
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [inputText, isProcessing, messages]);

  // Clear conversation
  const handleClear = useCallback(() => {
    const firstName = user?.name?.split(" ")[0] || "";
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content: `Conversa limpa. Como posso ajudar${firstName ? ", " + firstName : ""}?`,
        timestamp: new Date(),
      },
    ]);
  }, [user]);

  // Render a single message bubble
  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isLoading) {
      return (
        <View style={[styles.messageBubble, styles.assistantBubble]}>
          <View style={styles.typingIndicator}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
      );
    }

    const isUser = item.role === "user";

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.userRow : styles.assistantRow,
        ]}
      >
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Ionicons name="sparkles" size={14} color="#F59E0B" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {item.content}
          </Text>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={20} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.headerTitle}>CREW Assistant</Text>
            <Text style={styles.headerSubtitle}>
              {isProcessing ? "Pensando..." : "Online"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={20} color="#8892A4" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#5A6A80"
            value={inputText}
            onChangeText={setInputText}
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!isProcessing}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isProcessing) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1628",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2A40",
    backgroundColor: "#0F1D32",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#78350F",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "500",
  },
  clearButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#1A2A40",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#78350F",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: "#3B82F6",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#1A2A40",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
  },
  assistantText: {
    color: "#E2E8F0",
  },
  timestamp: {
    fontSize: 10,
    color: "#5A6A80",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5A6A80",
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1A2A40",
    backgroundColor: "#0F1D32",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#0A1628",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#1A2A40",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#1A2A40",
  },
});
