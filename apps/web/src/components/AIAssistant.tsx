import { useState, useRef, useCallback } from "react";
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
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import apiClient from "../api/client";

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

interface InterpretResponse {
  intent: "ADD_ROLE" | "UPDATE_ROLE" | "DELETE_ROLE" | "VIEW_ROLES";
  action: "CALL_API" | "NAVIGATE";
  method: "POST" | "PUT" | "DELETE" | "GET" | null;
  endpoint: string;
  payload: Record<string, unknown>;
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const append = useCallback((role: MessageRole, text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, timestamp: Date.now() },
    ]);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    append("user", text);
    setLoading(true);
    try {
      const { data } = await apiClient.post<InterpretResponse>("/api/ai/interpret", {
        user_text: text,
      });
      if (data.action === "NAVIGATE") {
        append("assistant", `Opening ${data.endpoint}.`);
        navigate(data.endpoint);
        setLoading(false);
        return;
      }
      if (data.payload?.error === "role_not_found") {
        append("assistant", `Error: ${(data.payload.message as string) || "Role not found."}`);
        setLoading(false);
        return;
      }
      if (data.action === "CALL_API" && data.method && data.endpoint) {
        const method = data.method.toLowerCase() as "get" | "post" | "put" | "delete";
        const hasBody = (data.method === "POST" || data.method === "PUT") && data.payload && Object.keys(data.payload).length > 0 && !data.payload.error;
        hasBody
          ? await apiClient.request({ method, url: data.endpoint, data: data.payload })
          : await apiClient.request({ method, url: data.endpoint });
        append("assistant", `Done: ${data.intent}.`);
      } else {
        append("assistant", `Done: ${data.intent}.`);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Request failed.";
      append("assistant", `Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [input, loading, append, navigate]);

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      append("assistant", "Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [append]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  return (
    <Paper elevation={2} sx={{ display: "flex", flexDirection: "column", height: 420, maxWidth: 480, overflow: "hidden" }}>
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
        <SmartToyIcon color="primary" />
        <Typography variant="subtitle1" fontWeight={600}>Role assistant</Typography>
      </Box>
      <List sx={{ flex: 1, overflow: "auto", py: 1 }}>
        {messages.length === 0 && (
          <ListItem>
            <ListItemText secondary="Try: Add role Admin, Delete role Teacher, Update role Parent to Guardian, Show roles." />
          </ListItem>
        )}
        {messages.map((m) => (
          <ListItem key={m.id} sx={{ alignItems: "flex-start", gap: 1 }}>
            {m.role === "user" ? <PersonIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.5 }} /> : <SmartToyIcon fontSize="small" color="primary" sx={{ mt: 0.5 }} />}
            <ListItemText primary={m.text} primaryTypographyProps={{ variant: "body2" }} />
          </ListItem>
        ))}
        {loading && (
          <ListItem>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <ListItemText primary="Interpreting…" primaryTypographyProps={{ variant: "body2" }} />
          </ListItem>
        )}
      </List>
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider", display: "flex", gap: 0.5, alignItems: "flex-end" }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Add role Admin, Show roles…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={loading}
          multiline
          maxRows={2}
        />
        <IconButton color="primary" onClick={listening ? stopListening : startListening} disabled={loading} title={listening ? "Stop" : "Mic"}>
          {listening ? <StopIcon /> : <MicIcon />}
        </IconButton>
        <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()} title="Send">
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
