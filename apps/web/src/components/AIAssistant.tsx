import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
  Collapse,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import ChatIcon from "@mui/icons-material/Chat";
import apiClient from "../api/client";

type MessageRole = "user" | "assistant";
type ChatState = "idle" | "listening" | "processing";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

interface InterpretResponse {
  menu_id: number | null;
  menu_name: string;
  parent_menu_id: number | null;
  parent_menu_name: string;
  route: string;
  action: "NAVIGATE" | "CALL_API";
  method: "POST" | "PUT" | "DELETE" | "GET" | null;
  endpoint: string | null;
  payload: Record<string, unknown>;
  requires_confirmation: boolean;
  error_type?: "SAFE_ERROR" | "NEED_CLARIFICATION" | null;
  error_message?: string | null;
}

interface PendingAction {
  data: InterpretResponse;
}

const SILENCE_MS = 1800;

const ROUTE_TO_SIDEBAR_PARENT: Record<string, string> = {
  "/roles": "config",
  "/menus": "config",
  "/permissions": "config",
  "/users": "users",
  "/tenants": "tenants",
};

function dispatchSidebarExpand(parentId: string): void {
  if (parentId === "") return;
  window.dispatchEvent(
    new CustomEvent("sidebar-expand", { detail: { parentId } })
  );
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef("");
  const submittedRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const append = useCallback((role: MessageRole, text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, timestamp: Date.now() },
    ]);
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatState]);

  const executeAction = useCallback(
    async (data: InterpretResponse) => {
      if (data.error_type && data.error_message) {
        append("assistant", data.error_message);
        return;
      }
      if (data.action === "NAVIGATE" && data.route) {
        const parentId =
          data.parent_menu_id != null
            ? String(data.parent_menu_id)
            : (ROUTE_TO_SIDEBAR_PARENT[data.route] ?? "");
        dispatchSidebarExpand(parentId);
        append("assistant", `Opening ${data.menu_name || data.route}.`);
        navigate(data.route);
        return;
      }
      if (data.payload && (data.payload as Record<string, unknown>).error) {
        append(
          "assistant",
          String((data.payload as Record<string, unknown>).message || "Request failed.")
        );
        return;
      }
      if (
        data.action === "CALL_API" &&
        data.method &&
        data.endpoint
      ) {
        const method = data.method.toLowerCase() as "get" | "post" | "put" | "delete";
        const hasBody =
          (data.method === "POST" || data.method === "PUT") &&
          data.payload &&
          Object.keys(data.payload).length > 0;
        try {
          hasBody
            ? await apiClient.request({ method, url: data.endpoint, data: data.payload })
            : await apiClient.request({ method, url: data.endpoint });
          append("assistant", `Done: ${data.menu_name || data.action}.`);
        } catch (err: unknown) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: string }).message)
              : "Request failed.";
          append("assistant", `Error: ${msg}`);
        }
      } else {
        append("assistant", data.menu_name ? `Opening ${data.menu_name}.` : "Done.");
      }
    },
    [append, navigate]
  );

  const submitText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatState === "processing") return;

      if (pendingAction) {
        if (/^\s*yes\s*$/i.test(trimmed)) {
          setPendingAction(null);
          setChatState("processing");
          append("user", "Yes");
          await executeAction(pendingAction.data);
          setChatState("idle");
        } else {
          append("assistant", "Cancelled. Say or type Yes to confirm.");
        }
        setInput("");
        return;
      }

      setInput("");
      append("user", trimmed);
      setChatState("processing");

      try {
        const { data } = await apiClient.post<InterpretResponse>("/api/ai/interpret", {
          user_text: trimmed,
        });

        if (data.requires_confirmation && data.action === "CALL_API" && data.method && data.endpoint) {
          setPendingAction({ data });
          append("assistant", `${data.menu_name || "This action"}? Say or type Yes to confirm.`);
          setChatState("idle");
          return;
        }

        await executeAction(data);
      } catch (err: unknown) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Request failed.";
        append("assistant", `Error: ${msg}`);
      } finally {
        setChatState("idle");
      }
    },
    [chatState, pendingAction, append, executeAction]
  );

  const handleSend = useCallback(() => {
    submitText(input);
  }, [input, submitText]);

  const startListening = useCallback(() => {
    const Win = window as Window & {
      SpeechRecognition?: new () => {
        start: () => void;
        stop: () => void;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        start: () => void;
        stop: () => void;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
      };
    };
    const API = Win.SpeechRecognition ?? Win.webkitSpeechRecognition;
    if (!API || chatState === "processing") return;

    transcriptRef.current = "";
    submittedRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const recognition = new API();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: { results: Array<Array<{ transcript: string }>> }) => {
      const t = event.results[event.results.length - 1][0].transcript;
      transcriptRef.current = (transcriptRef.current ? transcriptRef.current + " " + t : t).trim();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setChatState((s) => (s === "listening" ? "idle" : s));
      if (submittedRef.current) return;
      const transcript = transcriptRef.current;
      if (transcript.trim() === "") return;
      submittedRef.current = true;
      submitText(transcript);
    };

    recognition.onerror = () => {
      recognitionRef.current = null;
      setChatState((s) => (s === "listening" ? "idle" : s));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setChatState("listening");

    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, SILENCE_MS);
  }, [chatState, submitText]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const processing = chatState === "processing";
  const listening = chatState === "listening";

  return (
    <>
      <IconButton
        onClick={() => setOpen((o) => !o)}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1300,
          width: 56,
          height: 56,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          "&:hover": { bgcolor: "primary.dark" },
          boxShadow: 3,
        }}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <ChatIcon /> : <SmartToyIcon />}
      </IconButton>

      <Collapse in={open} sx={{ position: "fixed", bottom: 0, right: 0, zIndex: 1299, transformOrigin: "bottom right" }}>
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 380,
            maxWidth: "calc(100vw - 48px)",
            height: 420,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 2,
          }}
        >
          <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
            <SmartToyIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              Assistant
            </Typography>
          </Box>
          <List sx={{ flex: 1, overflow: "auto", py: 1 }}>
            {messages.length === 0 && (
              <ListItem>
                <ListItemText secondary="Try: Open roles, Go to users, Navigate to menus. Use mic for voice." />
              </ListItem>
            )}
            {messages.map((m) => (
              <ListItem key={m.id} sx={{ alignItems: "flex-start", gap: 1 }}>
                {m.role === "user" ? (
                  <PersonIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.5 }} />
                ) : (
                  <SmartToyIcon fontSize="small" color="primary" sx={{ mt: 0.5 }} />
                )}
                <ListItemText primary={m.text} primaryTypographyProps={{ variant: "body2" }} />
              </ListItem>
            ))}
            {listening && (
              <ListItem>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    animation: "pulse 1s ease-in-out infinite",
                    "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
                    mr: 1,
                  }}
                />
                <ListItemText primary="Listening…" primaryTypographyProps={{ variant: "body2" }} />
              </ListItem>
            )}
            {processing && (
              <ListItem>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <ListItemText primary="Processing…" primaryTypographyProps={{ variant: "body2" }} />
              </ListItem>
            )}
            <div ref={listEndRef} />
          </List>
          <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider", display: "flex", gap: 0.5, alignItems: "flex-end" }}>
            <TextField
              size="small"
              fullWidth
              placeholder={pendingAction ? "Type Yes to confirm" : "Open roles, Go to users…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={processing}
              multiline
              maxRows={2}
            />
            <IconButton
              color="primary"
              onClick={startListening}
              disabled={processing}
              title="Voice"
              sx={
                listening
                  ? {
                      "&": { animation: "micPulse 1.2s ease-in-out infinite" },
                      "@keyframes micPulse": {
                        "0%, 100%": { transform: "scale(1)", opacity: 1 },
                        "50%": { transform: "scale(1.1)", opacity: 0.8 },
                      },
                    }
                  : undefined
              }
            >
              <MicIcon />
            </IconButton>
            <IconButton color="primary" onClick={handleSend} disabled={processing || !input.trim()} title="Send">
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      </Collapse>
    </>
  );
}
