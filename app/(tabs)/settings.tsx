import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import {
  AppSettings,
  getBooks,
  getSettings,
  saveSettings,
} from "../../utils/storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [totalBooks, setTotalBooks] = useState(0);
  const [timeModal, setTimeModal] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const [notifAllowed, setNotifAllowed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      checkNotifPermission();
    }, []),
  );

  async function loadData() {
    const [s, books] = await Promise.all([getSettings(), getBooks()]);
    setSettings(s);
    setTotalBooks(books.length);
  }

  async function checkNotifPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    setNotifAllowed(status === "granted");
  }

  async function requestNotifPermission() {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifAllowed(status === "granted");
    if (status !== "granted") {
      Alert.alert(
        "Permission denied",
        "Please enable notifications in your phone Settings to use reminders.",
      );
    }
  }

  async function toggleReminder(val: boolean) {
    if (val && !notifAllowed) {
      await requestNotifPermission();
      return;
    }
    await saveSettings({ reminderEnabled: val });
    if (val) {
      await scheduleReminder(settings?.reminderTime ?? "20:00");
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    loadData();
  }

  async function scheduleReminder(time: string) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const [h, m] = time.split(":").map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📚 Time to read!",
        body: "Don't forget your daily reading goal — open ReadNest!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: m,
      },
    });
  }

  async function saveReminderTime() {
    const parts = timeInput.split(":");
    if (
      parts.length !== 2 ||
      isNaN(Number(parts[0])) ||
      isNaN(Number(parts[1])) ||
      Number(parts[0]) > 23 ||
      Number(parts[1]) > 59
    ) {
      Alert.alert(
        "Invalid time",
        "Please enter time in HH:MM format (e.g. 20:00)",
      );
      return;
    }
    await saveSettings({ reminderTime: timeInput });
    if (settings?.reminderEnabled) {
      await scheduleReminder(timeInput);
    }
    setTimeModal(false);
    loadData();
  }

  function fmtTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  const s = makeStyles(colors, isDark);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Summary ── */}
      <View style={s.profileCard}>
        <Text style={s.profileEmoji}>🪺</Text>
        <Text style={s.profileTitle}>ReadNest</Text>
        <Text style={s.profileSub}>
          {totalBooks} {totalBooks === 1 ? "book" : "books"} in your library
        </Text>
        <View style={s.streakPill}>
          <Text style={s.streakPillText}>
            🔥 {settings?.streak ?? 0} day streak
          </Text>
        </View>
      </View>

      {/* ── Appearance ── */}
      <Text style={s.sectionLabel}>APPEARANCE</Text>
      <View style={s.card}>
        <View style={s.row}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>🌙</Text>
            <View>
              <Text style={s.rowTitle}>Dark Mode</Text>
              <Text style={s.rowSub}>Easier on the eyes at night</Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* ── Reminders ── */}
      <Text style={s.sectionLabel}>REMINDERS</Text>
      <View style={s.card}>
        {/* Enable toggle */}
        <View style={s.row}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>🔔</Text>
            <View>
              <Text style={s.rowTitle}>Daily Reminder</Text>
              <Text style={s.rowSub}>Get notified to read every day</Text>
            </View>
          </View>
          <Switch
            value={settings?.reminderEnabled ?? false}
            onValueChange={toggleReminder}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        {settings?.reminderEnabled && (
          <>
            <View style={s.divider} />
            {/* Reminder time */}
            <TouchableOpacity
              style={s.row}
              onPress={() => {
                setTimeInput(settings?.reminderTime ?? "20:00");
                setTimeModal(true);
              }}
            >
              <View style={s.rowLeft}>
                <Text style={s.rowEmoji}>🕐</Text>
                <View>
                  <Text style={s.rowTitle}>Reminder Time</Text>
                  <Text style={s.rowSub}>
                    {fmtTime(settings?.reminderTime ?? "20:00")}
                  </Text>
                </View>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>

            {/* Notification permission status */}
            <View style={s.divider} />
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.rowEmoji}>{notifAllowed ? "✅" : "⚠️"}</Text>
                <View>
                  <Text style={s.rowTitle}>Notifications</Text>
                  <Text
                    style={[
                      s.rowSub,
                      { color: notifAllowed ? "#6BAE8A" : "#C46B6B" },
                    ]}
                  >
                    {notifAllowed ? "Allowed" : "Not allowed — tap to enable"}
                  </Text>
                </View>
              </View>
              {!notifAllowed && (
                <TouchableOpacity
                  style={s.allowBtn}
                  onPress={requestNotifPermission}
                >
                  <Text style={s.allowBtnText}>Allow</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      {/* ── Reading Goal ── */}
      <Text style={s.sectionLabel}>READING</Text>
      <View style={s.card}>
        <View style={s.row}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>🎯</Text>
            <View>
              <Text style={s.rowTitle}>Daily Page Goal</Text>
              <Text style={s.rowSub}>
                {settings?.dailyGoal ?? 5} pages per day
              </Text>
            </View>
          </View>
          <Text style={s.rowValue}>{settings?.dailyGoal ?? 5}p</Text>
        </View>
      </View>

      {/* ── About ── */}
      <Text style={s.sectionLabel}>ABOUT</Text>
      <View style={s.card}>
        <View style={s.row}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>📱</Text>
            <View>
              <Text style={s.rowTitle}>ReadNest</Text>
              <Text style={s.rowSub}>Version 1.0.0</Text>
            </View>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.row}>
          <View style={s.rowLeft}>
            <Text style={s.rowEmoji}>🎓</Text>
            <View>
              <Text style={s.rowTitle}>Built for students</Text>
              <Text style={s.rowSub}>Read offline, anytime, anywhere</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* ── Reminder Time Modal ── */}
      <Modal
        visible={timeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Set Reminder Time</Text>
            <Text style={s.modalSub}>
              Enter time in 24-hour format (e.g. 20:00 for 8 PM)
            </Text>
            <TextInput
              style={s.input}
              value={timeInput}
              onChangeText={setTimeInput}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              autoFocus
              maxLength={5}
            />
            <TouchableOpacity style={s.confirmBtn} onPress={saveReminderTime}>
              <Text style={s.confirmBtnText}>Save Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setTimeModal(false)}
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

    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    profileEmoji: { fontSize: 48, marginBottom: 8 },
    profileTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
    profileSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    streakPill: {
      backgroundColor: colors.accent + "22",
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
      marginTop: 10,
    },
    streakPillText: { fontSize: 13, fontWeight: "700", color: colors.accent },

    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
      letterSpacing: 1,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0 : 0.06,
      shadowRadius: 8,
      elevation: 2,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    rowEmoji: { fontSize: 22, width: 32, textAlign: "center" },
    rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
    rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    rowValue: { fontSize: 15, fontWeight: "700", color: colors.accent },
    chevron: { fontSize: 22, color: colors.textSecondary },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },

    allowBtn: {
      backgroundColor: colors.accent + "22",
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    allowBtnText: { fontSize: 13, fontWeight: "600", color: colors.accent },

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
