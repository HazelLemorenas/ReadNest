import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "../../context/ThemeContext";
import {
  addPagesRead,
  Book,
  getBooks,
  saveBook,
  saveNote,
  updateStreak,
} from "../../utils/storage";

const { width, height } = Dimensions.get("window");

// ── PDF.js HTML template ───────────────────────────
const getPdfHtml = (isDark: boolean) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: ${isDark ? "#1A1208" : "#F0EBE0"};
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      overflow-x: hidden;
    }
    #loading {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: ${isDark ? "#E8D5B7" : "#4A3728"};
      font-family: sans-serif; font-size: 16px;
      text-align: center;
    }
    #canvas {
      width: 100%;
      display: block;
      touch-action: pan-y pinch-zoom;
    }
    #error {
      display: none;
      color: #C46B6B;
      font-family: sans-serif;
      padding: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="loading">Loading PDF...<br/>Please wait</div>
  <div id="error">Could not load PDF.<br/>The file may be corrupted.</div>
  <canvas id="canvas"></canvas>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let pdfDoc = null;
    let currentPage = 1;
    let totalPages = 0;
    let rendering = false;

    // Listen for messages from React Native
    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    function handleMessage(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'LOAD_PDF') {
          loadPDF(data.base64, data.startPage);
        } else if (data.type === 'NEXT_PAGE') {
          if (currentPage < totalPages) renderPage(currentPage + 1);
        } else if (data.type === 'PREV_PAGE') {
          if (currentPage > 1) renderPage(currentPage - 1);
        } else if (data.type === 'GO_TO_PAGE') {
          renderPage(data.page);
        }
      } catch(e) {}
    }

    async function loadPDF(base64, startPage) {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
        totalPages = pdfDoc.numPages;
        document.getElementById('loading').style.display = 'none';
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'TOTAL_PAGES', total: totalPages })
        );
        renderPage(startPage || 1);
      } catch(e) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'ERROR', message: e.message })
        );
      }
    }

    async function renderPage(num) {
      if (rendering || !pdfDoc) return;
      if (num < 1 || num > totalPages) return;
      rendering = true;
      currentPage = num;

      try {
        const page = await pdfDoc.getPage(num);
        const canvas = document.getElementById('canvas');
        const scale = window.innerWidth / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({
          canvasContext: canvas.getContext('2d'),
          viewport
        }).promise;

        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'PAGE_CHANGED', page: currentPage })
        );
      } catch(e) {}

      rendering = false;
    }
  </script>
</body>
</html>
`;

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const webviewRef = useRef<WebView>(null);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [base64Pdf, setBase64Pdf] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [noteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [pageModal, setPageModal] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [pdfReady, setPdfReady] = useState(false);
  const startPageRef = useRef(1);
  const prevPageRef = useRef(1);

  useEffect(() => {
    loadBook();
  }, [id]);

  async function loadBook() {
    const books = await getBooks();
    const found = books.find((b) => b.id === id);
    if (!found) return;
    setBook(found);
    startPageRef.current = found.currentPage || 1;
    setCurrentPage(found.currentPage || 1);

    try {
      const b64 = await FileSystem.readAsStringAsync(found.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setBase64Pdf(b64);
    } catch (e) {
      Alert.alert("Error", "Could not read the PDF file.");
    }
    setLoading(false);
  }

  // Once WebView is ready and base64 is loaded, send PDF data
  function onWebViewLoad() {
    if (base64Pdf) {
      sendPdfToWebView();
    }
  }

  useEffect(() => {
    if (pdfReady && base64Pdf) {
      sendPdfToWebView();
    }
  }, [pdfReady, base64Pdf]);

  function sendPdfToWebView() {
    webviewRef.current?.injectJavaScript(`
      loadPDF(${JSON.stringify(base64Pdf)}, ${startPageRef.current});
      true;
    `);
  }

  // Handle messages from WebView
  async function onMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "TOTAL_PAGES") {
        setTotalPages(data.total);
        if (book) {
          const updated = { ...book, totalPages: data.total };
          setBook(updated);
          await saveBook(updated);
        }
      }

      if (data.type === "PAGE_CHANGED") {
        const newPage = data.page;
        const pagesRead = Math.max(0, newPage - prevPageRef.current);
        setCurrentPage(newPage);

        if (book) {
          const updated = {
            ...book,
            currentPage: newPage,
            lastReadAt: new Date().toISOString(),
          };
          setBook(updated);
          await saveBook(updated);
          if (pagesRead > 0) {
            await addPagesRead(pagesRead);
            await updateStreak();
          }
        }
        prevPageRef.current = newPage;
      }

      if (data.type === "ERROR") {
        Alert.alert("PDF Error", "Could not render this PDF.");
      }
    } catch (e) {}
  }

  function sendToWebView(msg: object) {
    webviewRef.current?.injectJavaScript(
      `handleMessage({ data: ${JSON.stringify(JSON.stringify(msg))} }); true;`,
    );
  }

  function nextPage() {
    sendToWebView({ type: "NEXT_PAGE" });
  }
  function prevPage() {
    sendToWebView({ type: "PREV_PAGE" });
  }

  function goToPage() {
    const num = parseInt(pageInput);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      sendToWebView({ type: "GO_TO_PAGE", page: num });
      setPageModal(false);
      setPageInput("");
    } else {
      Alert.alert("Invalid page", `Enter a page between 1 and ${totalPages}`);
    }
  }

  async function addNote() {
    if (!noteText.trim() || !book) return;
    await saveNote({
      id: `note_${Date.now()}`,
      bookId: book.id,
      page: currentPage,
      text: noteText.trim(),
      createdAt: new Date().toISOString(),
    });
    setNoteText("");
    setNoteModal(false);
    Alert.alert("Note saved!", `Note added for page ${currentPage}`);
  }

  const s = makeStyles(colors, isDark);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[s.loadingText, { color: colors.textSecondary }]}>
          Loading your book...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* ── Top Bar ── */}
      {showControls && (
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Text style={s.iconBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPageModal(true)}>
            <Text style={s.pageIndicator}>
              {currentPage} / {totalPages || "?"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => setNoteModal(true)}
          >
            <Text style={s.iconBtnText}>📝</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── WebView PDF Viewer ── */}
      <TouchableOpacity
        activeOpacity={1}
        style={{ flex: 1 }}
        onPress={() => setShowControls((v) => !v)}
      >
        <WebView
          ref={webviewRef}
          source={{ html: getPdfHtml(isDark) }}
          style={s.webview}
          onLoad={() => setPdfReady(true)}
          onMessage={onMessage}
          scrollEnabled
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
          allowFileAccess
          allowUniversalAccessFromFileURLs
        />
      </TouchableOpacity>

      {/* ── Bottom Controls ── */}
      {showControls && (
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.navBtn, currentPage <= 1 && s.navBtnDisabled]}
            onPress={prevPage}
            disabled={currentPage <= 1}
          >
            <Text style={s.navBtnText}>‹ Prev</Text>
          </TouchableOpacity>

          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${totalPages > 0 ? (currentPage / totalPages) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
            <Text style={s.progressPct}>
              {totalPages > 0
                ? Math.round((currentPage / totalPages) * 100)
                : 0}
              %
            </Text>
          </View>

          <TouchableOpacity
            style={[s.navBtn, currentPage >= totalPages && s.navBtnDisabled]}
            onPress={nextPage}
            disabled={currentPage >= totalPages}
          >
            <Text style={s.navBtnText}>Next ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Add Note Modal ── */}
      <Modal
        visible={noteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Add Note — Page {currentPage}</Text>
            <TextInput
              style={s.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Write your note here..."
              placeholderTextColor={colors.textSecondary}
              multiline
              autoFocus
              maxLength={500}
            />
            <TouchableOpacity style={s.confirmBtn} onPress={addNote}>
              <Text style={s.confirmBtnText}>Save Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setNoteModal(false)}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Go To Page Modal ── */}
      <Modal
        visible={pageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPageModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Go to Page</Text>
            <Text style={[s.modalSub, { color: colors.textSecondary }]}>
              Enter a page number (1 – {totalPages})
            </Text>
            <TextInput
              style={s.noteInput}
              value={pageInput}
              onChangeText={setPageInput}
              placeholder="e.g. 42"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity style={s.confirmBtn} onPress={goToPage}>
              <Text style={s.confirmBtnText}>Go</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => setPageModal(false)}
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
    container: { flex: 1, backgroundColor: isDark ? "#1A1208" : "#F0EBE0" },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    loadingText: { marginTop: 12, fontSize: 14 },
    webview: { flex: 1, backgroundColor: "transparent" },

    // Top bar
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "android" ? 40 : 50,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtnText: { fontSize: 22, color: colors.text },
    pageIndicator: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },

    // Bottom bar
    bottomBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    navBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    navBtnDisabled: { backgroundColor: colors.border },
    navBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    progressWrap: { flex: 1, gap: 4 },
    progressTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 6,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.accent,
      borderRadius: 6,
    },
    progressPct: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: "center",
      fontWeight: "600",
    },

    // Modals
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
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 4,
    },
    modalSub: { fontSize: 13, marginBottom: 16 },
    noteInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      minHeight: 80,
      textAlignVertical: "top",
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
