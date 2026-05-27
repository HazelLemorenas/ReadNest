import { useFocusEffect } from "expo-router";
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
  AppSettings,
  DailyProgress,
  getDailyProgress,
  getSettings,
  getTodayPages,
  saveSettings,
} from "../../utils/storage";

export default function GoalsScreen() {
  const { colors, isDark } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [todayPages, setTodayPages] = useState(0);
  const [history, setHistory] = useState<DailyProgress[]>([]);
  const [goalModal, setGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData() {
    const [s, t, h] = await Promise.all([
      getSettings(),
      getTodayPages(),
      getDailyProgress(),
    ]);
    setSettings(s);
    setTodayPages(t);
    // Show most recent days first
    setHistory([...h].reverse().slice(0, 14));
  }

  async function saveGoal() {
    const num = parseInt(goalInput);
    if (isNaN(num) || num < 1) {
      Alert.alert("Invalid goal", "Please enter a number greater than 0.");
      return;
    }
    await saveSettings({ dailyGoal: num });
    setGoalModal(false);
    loadData();
  }

  const dailyGoal = settings?.dailyGoal ?? 5;
  const progress = Math.min(todayPages / Math.max(dailyGoal, 1), 1);
  const goalReached = todayPages >= dailyGoal;
  const s = makeStyles(colors, isDark);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Today's Goal Card ── */}
      <View style={s.card}>
        <View style={s.cardRow}>
          <Text style={s.cardTitle}>Today's Goal</Text>
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => {
              setGoalInput(String(dailyGoal));
              setGoalModal(true);
            }}
          >
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.goalBig}>
          {todayPages}
          <Text style={s.goalSmall}> / {dailyGoal} pages</Text>
        </Text>

        <View style={s.track}>
          <View style={[s.fill, { width: `${progress * 100}%` }]} />
        </View>

        {goalReached ? (
          <View style={s.successBanner}>
            <Text style={s.successText}>🎉 Goal reached! Great job today!</Text>
          </View>
        ) : (
          <Text style={s.goalHint}>
            {dailyGoal - todayPages} more pages to reach your goal
          </Text>
        )}
      </View>

      {/* ── Streak Card ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Reading Streak</Text>
        <View style={s.streakRow}>
          <Text style={s.streakFire}>🔥</Text>
          <View>
            <Text style={s.streakNum}>{settings?.streak ?? 0} days</Text>
            <Text style={s.streakSub}>
              {settings?.streak === 0
                ? "Start reading to begin your streak!"
                : settings?.streak === 1
                  ? "Great start! Keep it going!"
                  : `You've been reading for ${settings?.streak} days in a row!`}
            </Text>
          </View>
        </View>
      </View>

      {/* ── 14-Day History ── */}
      <Text style={s.sectionTitle}>Last 14 Days</Text>
      {history.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>📖</Text>
          <Text style={s.emptyText}>No reading history yet</Text>
          <Text style={s.emptyHint}>
            Open a book and start reading to track your progress
          </Text>
        </View>
      ) : (
        history.map((day) => {
          const pct = Math.min(day.pagesRead / Math.max(dailyGoal, 1), 1);
          const reached = day.pagesRead >= dailyGoal;
          const dateLabel = new Date(day.date).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return (
            <View key={day.date} style={s.historyRow}>
              <View style={s.historyLeft}>
                <Text style={s.historyDate}>{dateLabel}</Text>
                <View style={s.historyTrack}>
                  <View
                    style={[
                      s.historyFill,
                      {
                        width: `${pct * 100}%`,
                        backgroundColor: reached ? "#6BAE8A" : colors.accent,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={s.historyRight}>
                <Text
                  style={[
                    s.historyPages,
                    { color: reached ? "#6BAE8A" : colors.text },
                  ]}
                >
                  {day.pagesRead}p
                </Text>
                {reached && <Text style={s.historyCheck}>✓</Text>}
              </View>
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />

      {/* ── Edit Goal Modal ── */}
      <Modal
        visible={goalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setGoalModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Set Daily Goal</Text>
            <Text style={s.modalSub}>
              How many pages do you want to read per day?
            </Text>
            <TextInput
              style={s.input}
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="e.g. 5"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity style={s.confirmBtn} onPress={saveGoal}>
              <Text style={s.confirmBtnText}>Save Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setGoalModal(false)}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20 },

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
    cardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    editBtn: {
      backgroundColor: colors.accent + "22",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    editBtnText: { fontSize: 13, fontWeight: "600", color: colors.accent },

    goalBig: {
      fontSize: 40,
      fontWeight: "800",
      color: colors.accent,
      marginBottom: 12,
    },
    goalSmall: { fontSize: 18, color: colors.textSecondary, fontWeight: "400" },
    track: {
      height: 10,
      backgroundColor: colors.border,
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 10,
    },
    fill: { height: "100%", backgroundColor: colors.accent, borderRadius: 10 },
    successBanner: {
      backgroundColor: "#6BAE8A22",
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginTop: 4,
    },
    successText: { fontSize: 13, color: "#6BAE8A", fontWeight: "600" },
    goalHint: { fontSize: 12, color: colors.textSecondary },

    streakRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginTop: 4,
    },
    streakFire: { fontSize: 44 },
    streakNum: { fontSize: 26, fontWeight: "800", color: colors.text },
    streakSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 32,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    emptyEmoji: { fontSize: 36, marginBottom: 10 },
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
      lineHeight: 20,
    },

    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyLeft: { flex: 1, marginRight: 12 },
    historyDate: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 6,
    },
    historyTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 6,
      overflow: "hidden",
    },
    historyFill: { height: "100%", borderRadius: 6 },
    historyRight: { alignItems: "center", minWidth: 36 },
    historyPages: { fontSize: 13, fontWeight: "700" },
    historyCheck: { fontSize: 12, color: "#6BAE8A", marginTop: 2 },

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
