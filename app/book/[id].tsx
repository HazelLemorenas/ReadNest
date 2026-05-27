import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import {
  Book,
  deleteNote,
  getBooks,
  getNotes,
  ReadingNote,
} from "../../utils/storage";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState<ReadingNote[]>([]);

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

  async function handleDeleteNote(noteId: string) {
    Alert.alert("Delete Note", "Remove this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteNote(noteId);
          loadData();
        },
      },
    ]);
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
                onLongPress={() => handleDeleteNote(note.id)}
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
  });
}
