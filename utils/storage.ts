import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

// ── Types ──────────────────────────────────────────

export type Book = {
  id: string;
  title: string;
  author: string;
  fileUri: string; // permanent location on phone storage
  totalPages: number;
  currentPage: number;
  lastReadAt: string; // ISO date string
  addedAt: string; // ISO date string
  coverColor: string; // random color used as cover background
};

export type ReadingNote = {
  id: string;
  bookId: string;
  page: number;
  text: string;
  createdAt: string;
};

export type DailyProgress = {
  date: string; // YYYY-MM-DD
  pagesRead: number;
};

export type AppSettings = {
  dailyGoal: number;
  reminderEnabled: boolean;
  reminderTime: string; // HH:MM format
  streak: number;
  lastStreakDate: string;
};

// ── Keys ───────────────────────────────────────────

const KEYS = {
  books: "readnest-books",
  notes: "readnest-notes",
  progress: "readnest-progress",
  settings: "readnest-settings",
};

// ── Default Settings ───────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  dailyGoal: 5,
  reminderEnabled: false,
  reminderTime: "20:00",
  streak: 0,
  lastStreakDate: "",
};

// ── Books ──────────────────────────────────────────

export async function getBooks(): Promise<Book[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.books);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveBook(book: Book): Promise<void> {
  const books = await getBooks();
  const exists = books.findIndex((b) => b.id === book.id);
  if (exists >= 0) {
    books[exists] = book;
  } else {
    books.push(book);
  }
  await AsyncStorage.setItem(KEYS.books, JSON.stringify(books));
}

export async function deleteBook(bookId: string): Promise<void> {
  const books = await getBooks();
  const book = books.find((b) => b.id === bookId);

  // Delete the actual PDF file from phone storage
  if (book?.fileUri) {
    try {
      await FileSystem.deleteAsync(book.fileUri, { idempotent: true });
    } catch {}
  }

  const updated = books.filter((b) => b.id !== bookId);
  await AsyncStorage.setItem(KEYS.books, JSON.stringify(updated));
}

export async function updateBookProgress(
  bookId: string,
  currentPage: number,
): Promise<void> {
  const books = await getBooks();
  const index = books.findIndex((b) => b.id === bookId);
  if (index >= 0) {
    books[index].currentPage = currentPage;
    books[index].lastReadAt = new Date().toISOString();
    await AsyncStorage.setItem(KEYS.books, JSON.stringify(books));
  }
}

// ── Notes ──────────────────────────────────────────

export async function getNotes(bookId: string): Promise<ReadingNote[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.notes);
    const all: ReadingNote[] = raw ? JSON.parse(raw) : [];
    return all.filter((n) => n.bookId === bookId);
  } catch {
    return [];
  }
}

export async function saveNote(note: ReadingNote): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.notes);
    const all: ReadingNote[] = raw ? JSON.parse(raw) : [];
    all.push(note);
    await AsyncStorage.setItem(KEYS.notes, JSON.stringify(all));
  } catch {}
}

export async function deleteNote(noteId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.notes);
    const all: ReadingNote[] = raw ? JSON.parse(raw) : [];
    const updated = all.filter((n) => n.id !== noteId);
    await AsyncStorage.setItem(KEYS.notes, JSON.stringify(updated));
  } catch {}
}

// ── Daily Progress ─────────────────────────────────

export async function getDailyProgress(): Promise<DailyProgress[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.progress);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addPagesRead(pages: number): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const all = await getDailyProgress();
    const index = all.findIndex((p) => p.date === today);
    if (index >= 0) {
      all[index].pagesRead += pages;
    } else {
      all.push({ date: today, pagesRead: pages });
    }
    await AsyncStorage.setItem(KEYS.progress, JSON.stringify(all));
  } catch {}
}

export async function getTodayPages(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const all = await getDailyProgress();
  return all.find((p) => p.date === today)?.pagesRead ?? 0;
}

// ── Settings & Streak ──────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await AsyncStorage.setItem(
    KEYS.settings,
    JSON.stringify({ ...current, ...patch }),
  );
}

export async function updateStreak(): Promise<number> {
  const settings = await getSettings();
  const today = new Date().toISOString().split("T")[0];

  if (settings.lastStreakDate === today) {
    return settings.streak; // already updated today
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const newStreak =
    settings.lastStreakDate === yesterdayStr
      ? settings.streak + 1 // consecutive day
      : 1; // streak broken, reset to 1

  await saveSettings({ streak: newStreak, lastStreakDate: today });
  return newStreak;
}

export async function updateNote(
  noteId: string,
  newText: string,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.notes);
    const all: ReadingNote[] = raw ? JSON.parse(raw) : [];
    const index = all.findIndex((n) => n.id === noteId);
    if (index >= 0) {
      all[index].text = newText;
      await AsyncStorage.setItem(KEYS.notes, JSON.stringify(all));
    }
  } catch {}
}
