import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Book, deleteBook, getBooks, saveBook } from "../../utils/storage";

const COVER_COLORS = [
  "#C4813A",
  "#7B6EA6",
  "#4A8FA8",
  "#6BAE8A",
  "#C46B6B",
  "#8A7A5E",
  "#5E8A7A",
  "#A87A5E",
];

export default function LibraryScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingUri, setPendingUri] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    const b = await getBooks();
    setBooks(b);
  }

  async function pickAndAddBook() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      if (file.size && file.size > 60 * 1024 * 1024) {
        Alert.alert("File too large", "Please choose a PDF under 60 MB.");
        return;
      }

      setLoading(true);
      const fileName = `book_${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: file.uri, to: destUri });
      setLoading(false);

      // Pre-fill title from filename, open modal
      const guessedTitle = file.name.replace(/\.pdf$/i, "");
      setTitleInput(guessedTitle);
      setAuthorInput("");
      setPendingUri(destUri);
      setPendingName(file.name);
      setModalVisible(true);
    } catch (e) {
      setLoading(false);
      Alert.alert("Error", "Could not open the file picker.");
    }
  }

  async function confirmAddBook() {
    if (!titleInput.trim()) {
      Alert.alert("Missing title", "Please enter a book title.");
      return;
    }
    const newBook: Book = {
      id: `book_${Date.now()}`,
      title: titleInput.trim(),
      author: authorInput.trim() || "Unknown Author",
      fileUri: pendingUri,
      totalPages: 0,
      currentPage: 1,
      lastReadAt: "",
      addedAt: new Date().toISOString(),
      coverColor: COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)],
    };
    await saveBook(newBook);
    await loadBooks();
    setModalVisible(false);
  }

  async function confirmDelete(book: Book) {
    Alert.alert("Remove Book", `Remove "${book.title}" from ReadNest?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteBook(book.id);
          loadBooks();
        },
      },
    ]);
  }

  const s = makeStyles(colors, isDark);

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {books.length === 0 && !loading ? (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>📭</Text>
            <Text style={s.emptyTitle}>Your library is empty</Text>
            <Text style={s.emptyHint}>
              Tap the button below to add your first PDF book
            </Text>
          </View>
        ) : (
          <View style={s.grid}>
            {books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={s.bookCard}
                onPress={() => router.push(`/book/${book.id}`)}
                onLongPress={() => confirmDelete(book)}
                activeOpacity={0.85}
              >
                <View style={[s.cover, { backgroundColor: book.coverColor }]}>
                  <Text style={s.coverEmoji}>📗</Text>
                  {book.currentPage > 1 && (
                    <View style={s.progressPill}>
                      <Text style={s.progressPillText}>
                        {Math.round(
                          (book.currentPage / Math.max(book.totalPages, 1)) *
                            100,
                        )}
                        %
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={s.title} numberOfLines={2}>
                  {book.title}
                </Text>
                <Text style={s.author} numberOfLines={1}>
                  {book.author}
                </Text>
                <View style={s.track}>
                  <View
                    style={[
                      s.fill,
                      {
                        width: `${(book.currentPage / Math.max(book.totalPages, 1)) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Add Book Button ── */}
      <View style={s.fabContainer}>
        {loading ? (
          <View style={s.fab}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <TouchableOpacity
            style={s.fab}
            onPress={pickAndAddBook}
            activeOpacity={0.85}
          >
            <Text style={s.fabText}>+ Add Book</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Add Book Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Name your book</Text>
            <Text style={s.modalSub}>You can edit this anytime</Text>

            <Text style={s.inputLabel}>Title</Text>
            <TextInput
              style={s.input}
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="e.g. Trading in the Zone"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />

            <Text style={s.inputLabel}>Author</Text>
            <TextInput
              style={s.input}
              value={authorInput}
              onChangeText={setAuthorInput}
              placeholder="e.g. Mark Douglas"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity style={s.confirmBtn} onPress={confirmAddBook}>
              <Text style={s.confirmBtnText}>Add to Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20 },

    emptyState: { alignItems: "center", paddingTop: 80 },
    emptyEmoji: { fontSize: 60, marginBottom: 16 },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    emptyHint: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    bookCard: { width: "46%" },
    cover: {
      width: "100%",
      aspectRatio: 0.7,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    coverEmoji: { fontSize: 40 },
    progressPill: {
      position: "absolute",
      bottom: 8,
      right: 8,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    progressPillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    title: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    author: { fontSize: 11, color: colors.textSecondary, marginBottom: 6 },
    track: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    fill: { height: "100%", backgroundColor: colors.accent, borderRadius: 4 },

    fabContainer: { position: "absolute", bottom: 24, left: 20, right: 20 },
    fab: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    fabText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalBox: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    modalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
    inputLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      marginBottom: 16,
    },
    confirmBtn: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      marginBottom: 10,
    },
    confirmBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    cancelBtn: { paddingVertical: 10, alignItems: "center" },
    cancelBtnText: { color: colors.textSecondary, fontSize: 14 },
  });
}
