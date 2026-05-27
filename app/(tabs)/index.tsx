import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import {
  AppSettings,
  Book,
  getBooks,
  getSettings,
  getTodayPages,
} from "../../utils/storage";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [todayPages, setTodayPages] = useState(0);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    loadData();
    setGreeting(getGreeting());
  }, []);

  async function loadData() {
    const [b, s, t] = await Promise.all([
      getBooks(),
      getSettings(),
      getTodayPages(),
    ]);
    setBooks(b);
    setSettings(s);
    setTodayPages(t);
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  // Most recently read book
  const lastRead = books
    .filter((b) => b.lastReadAt)
    .sort(
      (a, b) =>
        new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime(),
    )[0];

  // Recent books (up to 4)
  const recentBooks = books.slice(0, 4);

  const goalProgress =
    settings?.dailyGoal && settings.dailyGoal > 0
      ? Math.min(todayPages / settings.dailyGoal, 1)
      : 0;

  const s = makeStyles(colors, isDark);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting} 👋</Text>
          <Text style={s.headerTitle}>ReadNest</Text>
        </View>
        <View style={s.streakBadge}>
          <Text style={s.streakEmoji}>🔥</Text>
          <Text style={s.streakCount}>{settings?.streak ?? 0}</Text>
          <Text style={s.streakLabel}>day streak</Text>
        </View>
      </View>

      {/* ── Today's Goal ── */}
      <View style={s.card}>
        <View style={s.goalHeader}>
          <Text style={s.cardTitle}>Today's Goal</Text>
          <Text style={s.goalCount}>
            {todayPages} / {settings?.dailyGoal ?? 5} pages
          </Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${goalProgress * 100}%` }]} />
        </View>
        {goalProgress >= 1 ? (
          <Text style={s.goalDone}>🎉 Goal completed for today!</Text>
        ) : (
          <Text style={s.goalHint}>
            {(settings?.dailyGoal ?? 5) - todayPages} more pages to reach your
            goal
          </Text>
        )}
      </View>

      {/* ── Continue Reading ── */}
      <Text style={s.sectionTitle}>Continue Reading</Text>
      {lastRead ? (
        <TouchableOpacity
          style={s.continueCard}
          onPress={() => router.push(`/reader/${lastRead.id}`)}
          activeOpacity={0.85}
        >
          {/* Book color cover */}
          <View
            style={[s.continueCover, { backgroundColor: lastRead.coverColor }]}
          >
            <Text style={s.coverEmoji}>📖</Text>
          </View>
          <View style={s.continueInfo}>
            <Text style={s.continueTitle} numberOfLines={2}>
              {lastRead.title}
            </Text>
            <Text style={s.continueAuthor}>{lastRead.author}</Text>
            <Text style={s.continuePage}>
              Page {lastRead.currentPage} of {lastRead.totalPages}
            </Text>
            {/* Progress bar */}
            <View style={s.miniTrack}>
              <View
                style={[
                  s.miniFill,
                  {
                    width: `${(lastRead.currentPage / Math.max(lastRead.totalPages, 1)) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={s.continueArrow}>
            <Text style={{ fontSize: 20, color: colors.accent }}>›</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>📚</Text>
          <Text style={s.emptyText}>No books yet</Text>
          <Text style={s.emptyHint}>Go to Library to add your first book</Text>
        </View>
      )}

      {/* ── Recent Books ── */}
      {recentBooks.length > 0 && (
        <>
          <View style={s.rowHeader}>
            <Text style={s.sectionTitle}>My Books</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/library")}>
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.booksRow}
          >
            {recentBooks.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={s.bookCard}
                onPress={() => router.push(`/book/${book.id}`)}
                activeOpacity={0.85}
              >
                <View
                  style={[s.bookCover, { backgroundColor: book.coverColor }]}
                >
                  <Text style={s.bookEmoji}>📗</Text>
                </View>
                <Text style={s.bookTitle} numberOfLines={2}>
                  {book.title}
                </Text>
                <Text style={s.bookAuthor} numberOfLines={1}>
                  {book.author}
                </Text>
                <View style={s.bookTrack}>
                  <View
                    style={[
                      s.bookFill,
                      {
                        width: `${(book.currentPage / Math.max(book.totalPages, 1)) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
    },

    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 24,
    },
    greeting: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    streakBadge: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    streakEmoji: {
      fontSize: 22,
    },
    streakCount: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.accent,
    },
    streakLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 1,
    },

    // Card
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 28,
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
    },
    goalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    goalCount: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.accent,
    },
    progressTrack: {
      height: 10,
      backgroundColor: colors.border,
      borderRadius: 10,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: 10,
    },
    goalDone: {
      fontSize: 13,
      color: colors.accent,
      marginTop: 8,
      fontWeight: "600",
    },
    goalHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
    },

    // Section
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    rowHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    seeAll: {
      fontSize: 13,
      color: colors.accent,
      fontWeight: "600",
    },

    // Continue Reading
    continueCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    continueCover: {
      width: 70,
      height: 95,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    coverEmoji: {
      fontSize: 30,
    },
    continueInfo: {
      flex: 1,
    },
    continueTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 3,
    },
    continueAuthor: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    continuePage: {
      fontSize: 12,
      color: colors.accent,
      fontWeight: "600",
      marginBottom: 8,
    },
    miniTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 6,
      overflow: "hidden",
    },
    miniFill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: 6,
    },
    continueArrow: {
      paddingLeft: 8,
    },

    // Empty state
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 32,
      alignItems: "center",
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    emptyEmoji: {
      fontSize: 40,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    emptyHint: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
    },

    // Books row
    booksRow: {
      paddingBottom: 4,
      gap: 14,
    },
    bookCard: {
      width: 120,
    },
    bookCover: {
      width: 120,
      height: 160,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    bookEmoji: {
      fontSize: 36,
    },
    bookTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    bookAuthor: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    bookTrack: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    bookFill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
  });
}
