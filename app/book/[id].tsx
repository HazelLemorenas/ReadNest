import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
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
import {
  Book,
  deleteBook,
  deleteNote,
  getBooks,
  getNotes,
  ReadingNote,
  saveBook,
  updateNote,
} from "../../utils/storage";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<ReadingNote[]>([]);
  const [editModal, setEditModal] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");
  const [noteActionModal, setNoteActionModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<ReadingNote | null>(null);
  const [editNoteModal, setEditNoteModal] = useState(false);
  const [editNoteText, setEditNoteText] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id]),
  );

  async function loadData() {
    const books = await getBooks();
    const found = books.find((b) => b.id === id);
    setBook(found ?? null);
    if (found) {
      const n = await getNotes(found.id);
      setNotes(n);
    }
  }

  async function handleDeleteBook() {
    Alert.alert(
      "Delete Book",
      `Are you sure you want to delete "${book?.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteBook(book!.id);
            router.back();
          },
        },
      ],
    );
  }
  function openNoteActions(note: ReadingNote) {
    setSelectedNote(note);
    setNoteActionModal(true);
  }

  async function handleEditNote() {
    setNoteActionModal(false);
    setEditNoteText(selectedNote?.text ?? "");
    setEditNoteModal(true);
  }

  async function handleSaveNoteEdit() {
    if (!editNoteText.trim()) {
      Alert.alert("Empty note", "Please write something.");
      return;
    }
    await updateNote(selectedNote!.id, editNoteText.trim());
    setEditNoteModal(false);
    setSelectedNote(null);
    loadData();
  }

  async function handleDeleteSelectedNote() {
    Alert.alert("Delete Note", "Remove this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteNote(selectedNote!.id);
          setNoteActionModal(false);
          setSelectedNote(null);
          loadData();
        },
      },
    ]);
  }

  async function handleSaveEdit() {
    if (!titleInput.trim()) {
      Alert.alert("Missing title", "Please enter a book title.");
      return;
    }
    const updated = {
      ...book!,
      title: titleInput.trim(),
      author: authorInput.trim() || "Unknown Author",
    };
    await saveBook(updated);
    setEditModal(false);
    loadData();
  }

  if (!book) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Book not found.</Text>
      </View>
    );
  }

  const progress =
    book.totalPages > 0
      ? Math.round((book.currentPage / book.totalPages) * 100)
      : 0;

  const s = makeStyles(colors, isDark);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Hero Cover ── */}
        <View style={[s.hero, { backgroundColor: book.coverColor }]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={s.heroEmoji}>📗</Text>
          <Text style={s.heroTitle}>{book.title}</Text>
          <Text style={s.heroAuthor}>{book.author}</Text>
        </View>

        <View style={s.content}>
          {/* ── Progress Card ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Reading Progress</Text>
            <View style={s.progressRow}>
              <View style={s.progressStat}>
                <Text style={s.statNum}>{book.currentPage}</Text>
                <Text style={s.statLabel}>Current page</Text>
              </View>
              <View style={s.progressDivider} />
              <View style={s.progressStat}>
                <Text style={s.statNum}>
                  {book.totalPages > 0 ? book.totalPages : "?"}
                </Text>
                <Text style={s.statLabel}>Total pages</Text>
              </View>
              <View style={s.progressDivider} />
              <View style={s.progressStat}>
                <Text style={[s.statNum, { color: colors.accent }]}>
                  {progress}%
                </Text>
                <Text style={s.statLabel}>Complete</Text>
              </View>
            </View>
            <View style={s.track}>
              <View style={[s.fill, { width: `${progress}%` }]} />
            </View>
            {book.lastReadAt ? (
              <Text style={s.lastRead}>
                Last read:{" "}
                {new Date(book.lastReadAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            ) : (
              <Text style={s.lastRead}>Not started yet</Text>
            )}
          </View>
          {/* ── Edit / Delete Buttons ── */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => {
                setTitleInput(book.title);
                setAuthorInput(book.author);
                setEditModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={s.editBtnText}>✏️ Edit Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={handleDeleteBook}
              activeOpacity={0.85}
            >
              <Text style={s.deleteBtnText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
          {/* ── Read Button ── */}
          <TouchableOpacity
            style={s.readBtn}
            onPress={() => router.push(`/reader/${book.id}`)}
            activeOpacity={0.85}
          >
            <Text style={s.readBtnText}>
              {book.currentPage > 1
                ? "▶  Continue Reading"
                : "▶  Start Reading"}
            </Text>
          </TouchableOpacity>
          {/* ── Notes ── */}
          <View style={s.notesHeader}>
            <Text style={s.sectionTitle}>My Notes</Text>
            <Text style={s.notesCount}>{notes.length} notes</Text>
          </View>
          {notes.length === 0 ? (
            <View style={s.emptyNotes}>
              <Text style={s.emptyNotesEmoji}>📝</Text>
              <Text style={s.emptyNotesText}>
                No notes yet — you can add notes while reading
              </Text>
            </View>
          ) : (
            notes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={s.noteCard}
                onPress={() => openNoteActions(note)}
                activeOpacity={0.8}
              >
                <View style={s.notePageBadge}>
                  <Text style={s.notePageText}>p.{note.page}</Text>
                </View>
                <View style={s.noteBody}>
                  <Text style={s.noteText}>{note.text}</Text>
                  <Text style={s.noteDate}>
                    {new Date(note.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 40 }} />
          {/* ── Edit Modal ── */}
          <Modal
            visible={editModal}
            transparent
            animationType="slide"
            onRequestClose={() => setEditModal(false)}
          >
            <KeyboardAvoidingView
              style={s.modalOverlay}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={s.modalBox}>
                <Text style={s.modalTitle}>Edit Book Info</Text>
                <Text style={s.inputLabel}>Title</Text>
                <TextInput
                  style={s.input}
                  value={titleInput}
                  onChangeText={setTitleInput}
                  placeholder="Book title"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />
                <Text style={s.inputLabel}>Author</Text>
                <TextInput
                  style={s.input}
                  value={authorInput}
                  onChangeText={setAuthorInput}
                  placeholder="Author name"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity style={s.confirmBtn} onPress={handleSaveEdit}>
                  <Text style={s.confirmBtnText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setEditModal(false)}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Modal>
          ;{/* ── Note Action Modal ── */}
          <Modal
            visible={noteActionModal}
            transparent
            animationType="fade"
            onRequestClose={() => setNoteActionModal(false)}
          >
            <TouchableOpacity
              style={s.modalOverlay}
              activeOpacity={1}
              onPress={() => setNoteActionModal(false)}
            >
              <View style={s.actionSheet}>
                <View style={s.actionSheetHandle} />

                {selectedNote && (
                  <View style={s.actionSheetPreview}>
                    <Text style={s.actionSheetPage}>
                      Page {selectedNote.page}
                    </Text>
                    <Text style={s.actionSheetText} numberOfLines={3}>
                      {selectedNote.text}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={s.actionSheetBtn}
                  onPress={handleEditNote}
                >
                  <Text style={s.actionSheetBtnText}>✏️ Edit Note</Text>
                </TouchableOpacity>

                <View style={s.actionSheetDivider} />

                <TouchableOpacity
                  style={s.actionSheetBtn}
                  onPress={handleDeleteSelectedNote}
                >
                  <Text style={[s.actionSheetBtnText, { color: "#C46B6B" }]}>
                    🗑️ Delete Note
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.actionSheetBtn, { marginTop: 8 }]}
                  onPress={() => setNoteActionModal(false)}
                >
                  <Text
                    style={[
                      s.actionSheetBtnText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
          ;{/* ── Edit Note Modal ── */}
          <Modal
            visible={editNoteModal}
            transparent
            animationType="slide"
            onRequestClose={() => setEditNoteModal(false)}
          >
            <KeyboardAvoidingView
              style={s.modalOverlay}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={s.modalBox}>
                <Text style={s.modalTitle}>Edit Note</Text>
                <Text style={s.inputLabel}>Page {selectedNote?.page}</Text>
                <TextInput
                  style={[
                    s.input,
                    { minHeight: 100, textAlignVertical: "top" },
                  ]}
                  value={editNoteText}
                  onChangeText={setEditNoteText}
                  placeholder="Write your note..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  autoFocus
                  maxLength={500}
                />
                <TouchableOpacity
                  style={s.confirmBtn}
                  onPress={handleSaveNoteEdit}
                >
                  <Text style={s.confirmBtnText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setEditNoteModal(false)}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Modal>
          ;
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Hero
    hero: {
      paddingTop: 60,
      paddingBottom: 32,
      alignItems: "center",
      paddingHorizontal: 20,
    },
    backBtn: {
      position: "absolute",
      top: 33,
      left: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: "rgba(0,0,0,0.2)",
      borderRadius: 20,
    },
    backText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    heroEmoji: { fontSize: 64, marginBottom: 12 },
    heroTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: "#fff",
      textAlign: "center",
      marginBottom: 6,
    },
    heroAuthor: { fontSize: 14, color: "rgba(255,255,255,0.8)" },

    content: { padding: 20 },

    // Card
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
    },
    progressRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 16,
    },
    progressStat: { alignItems: "center" },
    statNum: { fontSize: 22, fontWeight: "800", color: colors.text },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    progressDivider: {
      width: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    track: {
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 10,
    },
    fill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: 8,
    },
    lastRead: { fontSize: 12, color: colors.textSecondary },

    // Read button
    readBtn: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 28,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    readBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    // Notes
    notesHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    notesCount: { fontSize: 13, color: colors.textSecondary },
    emptyNotes: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    emptyNotesEmoji: { fontSize: 32, marginBottom: 8 },
    emptyNotesText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    noteCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      flexDirection: "row",
      borderWidth: 1,
      borderColor: colors.border,
    },
    notePageBadge: {
      backgroundColor: colors.accent + "22",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: "flex-start",
      marginRight: 12,
    },
    notePageText: { fontSize: 12, fontWeight: "700", color: colors.accent },
    noteBody: { flex: 1 },
    noteText: { fontSize: 14, color: colors.text, lineHeight: 20 },
    noteDate: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    editBtn: {
      flex: 1,
      backgroundColor: colors.accent + "22",
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.accent + "44",
    },
    editBtnText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
    deleteBtn: {
      flex: 1,
      backgroundColor: "#C46B6B22",
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#C46B6B44",
    },
    deleteBtnText: { color: "#C46B6B", fontSize: 14, fontWeight: "700" },
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
      marginBottom: 20,
    },
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
    actionSheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 36,
    },
    actionSheetHandle: {
      width: 36,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    actionSheetPreview: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionSheetPage: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.accent,
      marginBottom: 4,
    },
    actionSheetText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    actionSheetBtn: {
      paddingVertical: 14,
      alignItems: "center",
    },
    actionSheetBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    actionSheetDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
  });
}
