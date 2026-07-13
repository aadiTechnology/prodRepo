import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Collapse,
  alpha,
  styled,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ListAltIcon from "@mui/icons-material/ListAlt";
import CampusBuddyMascot from "./CampusBuddyMascot";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useRBAC } from "../context/RBACContext";
import { colorTokens } from "../tokens/colors";
import { NAV_ACTION_PAGES, hintForPage } from "../config/navigationAssistant";
import {
  isAiAssistantPermissionPath,
  isSidebarHiddenModule,
} from "../utils/menuNavigation";
import type { MenuNode } from "../types/menu";

type MessageRole = "user" | "assistant";
type ChatState = "idle" | "listening" | "processing";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  isError?: boolean;
  variant?: "guide" | "greeting";
}

interface InterpretOption {
  menu_id: number | null;
  menu_name: string;
  route: string;
  parent_menu_id: number | null;
  parent_menu_name: string;
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
  options?: InterpretOption[];
}

interface ApiChatMessage {
  id: number;
  client_message_id: string | null;
  role: "user" | "assistant" | "system";
  message_text: string;
  is_error: boolean;
  input_source: string | null;
  route: string | null;
  created_at: string;
}

interface ChatSessionResponse {
  session_id: number;
  messages: ApiChatMessage[];
}

interface SaveChatMessageBody {
  role: "user" | "assistant";
  message_text: string;
  is_error?: boolean;
  input_source?: string;
  client_message_id?: string;
  route?: string;
  menu_name?: string;
  parent_menu_id?: number | null;
}

const SILENCE_MS = 1800;
const MAX_TYPEAHEAD = 6;
const FAB_TOOLTIP_KEY = "campus_buddy_fab_tooltip_dismissed";

const GREETING_RE =
  /^(hi|hello|hey|hiya|howdy|good\s*(morning|afternoon|evening)|namaste)\b/i;
const HELP_RE = /^(help|guide|how\s+to\s+use|tutorial|instructions?)\b/i;

interface NavigableMenu {
  id: number | string;
  name: string;
  path: string;
  parentId: number | null;
  hint: string;
  isAction?: boolean;
}

const ROUTE_TO_SIDEBAR_PARENT: Record<string, string> = {
  "/roles": "config",
  "/menus": "config",
  "/permissions": "config",
  "/users": "users",
  "/tenants": "tenants",
  "/admin/permission-management": "system-config",
};

const P = colorTokens.preschool;
const PRIMARY = colorTokens.primary;

/** Matches Sidebar `HeaderGradient` — turquoise → primary blue */
const brandGradient = `linear-gradient(135deg, ${P.turquoise.main} 0%, ${PRIMARY.main} 100%)`;

const PanelRoot = styled(Paper)(() => ({
  position: "fixed",
  bottom: 92,
  right: 24,
  width: 400,
  maxWidth: "calc(100vw - 32px)",
  height: 480,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: 24,
  border: `1px solid ${colorTokens.border.default}`,
  background: "#FFF9F0", // Warm cream background matching app theme
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.06)",
}));

const PanelHeader = styled(Box)(({ theme }) => ({
  position: "relative",
  padding: theme.spacing(2, 2, 1.75),
  background: brandGradient,
  borderRadius: "0 0 32px 32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  color: "#ffffff",
  overflow: "hidden",
  boxShadow: `0 8px 20px ${alpha(P.turquoise.main, 0.22)}`,
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: -28,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: "50%",
    background: alpha("#ffffff", 0.1),
  },
}));

const FabButton = styled(IconButton)(() => ({
  position: "relative",
  width: 68,
  height: 68,
  padding: 0,
  overflow: "visible",
  background: "transparent",
  transition: "transform 0.25s ease",
  "&:hover": {
    transform: "scale(1.08)",
  },
}));

const FabTooltipCard = styled(Paper)(() => ({
  position: "fixed",
  bottom: 100,
  right: 24,
  zIndex: 1301,
  maxWidth: 260,
  padding: "12px 14px",
  borderRadius: 16,
  border: `1px solid ${alpha(P.turquoise.main, 0.25)}`,
  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.12)",
}));

const PulseRing = styled(Box)(() => ({
  position: "absolute",
  inset: -5,
  borderRadius: "50%",
  border: `2px solid ${alpha("#ffffff", 0.95)}`,
  animation: "buddyHeaderPulse 1.35s ease-in-out infinite",
  pointerEvents: "none",
  "@keyframes buddyHeaderPulse": {
    "0%, 100%": { transform: "scale(1)", opacity: 0.95 },
    "50%": { transform: "scale(1.14)", opacity: 0.3 },
  },
}));

const TapHintIcon = styled(TouchAppIcon)(() => ({
  color: P.turquoise.main,
  animation: "buddyTapBounce 1s ease-in-out infinite",
  "@keyframes buddyTapBounce": {
    "0%, 100%": { transform: "translateY(0)" },
    "50%": { transform: "translateY(-3px)" },
  },
}));

const ChatScrollArea = styled(Box)(() => ({
  flex: 1,
  overflow: "auto",
  padding: "12px 14px",
  position: "relative",
  background: "#FFF9F0", // Warm cream background matching app theme
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(P.turquoise.main, 0.25),
    borderRadius: 8,
  },
}));

const SuggestionChip = styled(Box)(() => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 15,
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
  border: `1px solid ${alpha(P.turquoise.main, 0.3)}`,
  background: "#FFFFFF",
  color: colorTokens.sidebar.text.primary,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
  transition: "all 0.2s ease",
  "&:hover": {
    background: alpha(P.turquoise.main, 0.1),
    borderColor: P.turquoise.main,
    transform: "translateX(2px)",
    boxShadow: "0 4px 12px rgba(78, 205, 196, 0.15)",
  },
}));

const InputFooter = styled(Box)(() => ({
  position: "relative",
  padding: "12px 14px",
  borderTop: `1px solid ${colorTokens.border.default}`,
  background: "#FFFBF5", // Slightly elevated warm background
}));

const TypeaheadPanel = styled(Paper)(() => ({
  position: "absolute",
  bottom: "100%",
  left: 12,
  right: 12,
  marginBottom: 6,
  maxHeight: 220,
  overflow: "auto",
  borderRadius: 16,
  border: `1px solid ${colorTokens.border.default}`,
  background: "#FFFFFF",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(P.turquoise.main, 0.25),
    borderRadius: 8,
  },
}));

const TypeaheadRow = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  cursor: "pointer",
  borderRadius: 12,
  margin: "2px 6px",
  transition: "background 0.18s ease",
  "&:hover": {
    background: alpha(P.turquoise.main, 0.08),
  },
}));

const BuddyAvatar = styled(Box)<{ variant: "user" | "assistant" | "error" }>(({ variant }) => {
  const bg =
    variant === "user"
      ? brandGradient
      : variant === "error"
        ? alpha(colorTokens.error.main, 0.12)
        : brandGradient;
  return {
    width: 30,
    height: 30,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: bg,
    color: "#ffffff",
    fontSize: "0.72rem",
    fontWeight: 700,
    border: `2px solid ${alpha("#ffffff", 0.85)}`,
    boxShadow: `0 2px 8px ${alpha(P.turquoise.main, 0.2)}`,
  };
});

const MessageBubble = styled(Box)<{ isUser: boolean; isError?: boolean }>(({ isUser, isError }) => ({
  maxWidth: "82%",
  padding: "10px 14px",
  borderRadius: isUser ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
  background: isUser
    ? alpha(P.turquoise.main, 0.15)
    : isError
      ? alpha(colorTokens.error.main, 0.1)
      : "#FFFFFF",
  border: `1px solid ${
    isUser
      ? alpha(P.turquoise.main, 0.3)
      : isError
        ? alpha(colorTokens.error.main, 0.3)
        : colorTokens.border.default
  }`,
  boxShadow: isUser ? "0 2px 8px rgba(78, 205, 196, 0.12)" : "0 2px 8px rgba(0, 0, 0, 0.04)",
}));

const WelcomeCard = styled(Box)(() => ({
  textAlign: "center",
  padding: "18px 16px 14px",
  borderRadius: 24,
  background: "#FFFFFF",
  border: `1px solid ${colorTokens.border.default}`,
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
  marginBottom: 12,
}));

function dispatchSidebarExpand(parentId: string): void {
  if (parentId === "") return;
  window.dispatchEvent(
    new CustomEvent("sidebar-expand", { detail: { parentId } })
  );
}

function flattenNavigableMenus(nodes: MenuNode[]): NavigableMenu[] {
  const byPath = new Map<string, NavigableMenu>();
  const visit = (node: MenuNode, parent: number | null) => {
    if (isSidebarHiddenModule(node.name)) return;
    const path = (node.path || "").trim();
    if (path && !path.includes(":") && !isAiAssistantPermissionPath(path) && !byPath.has(path)) {
      byPath.set(path, {
        id: node.id,
        name: node.name,
        path,
        parentId: parent,
        hint: hintForPage(node.name, path),
      });
    }
    node.children?.forEach((child) => visit(child, node.id));
  };
  nodes.forEach((node) => visit(node, null));
  return Array.from(byPath.values());
}

function buildNavigableMenus(
  menus: MenuNode[],
  hasPermission: (permission: string) => boolean
): NavigableMenu[] {
  const fromMenus = flattenNavigableMenus(menus);
  const existingPaths = new Set(fromMenus.map((m) => m.path));
  const actions: NavigableMenu[] = NAV_ACTION_PAGES.filter(
    (a) => hasPermission(a.permission) && !existingPaths.has(a.path)
  ).map((a) => ({
    id: `action:${a.path}`,
    name: a.name,
    path: a.path,
    parentId: null,
    hint: a.hint,
    isAction: true,
  }));
  return [...fromMenus, ...actions];
}

interface MenuGroup {
  id: number | string;
  name: string;
  pages: NavigableMenu[];
}

/**
 * Groups the RBAC-granted menus into sections for the "My pages" browser.
 * The `menus` come straight from the backend RBAC context, so every entry here
 * is already permission-filtered — no extra access checks are needed.
 */
function buildMenuGroups(menus: MenuNode[]): MenuGroup[] {
  const groups: MenuGroup[] = [];
  const standalone: NavigableMenu[] = [];
  const seen = new Set<string>();

  const toPage = (node: MenuNode, parentId: number | null): NavigableMenu | null => {
    const path = (node.path || "").trim();
    if (!path || path.includes(":") || isAiAssistantPermissionPath(path) || seen.has(path)) return null;
    seen.add(path);
    return {
      id: node.id,
      name: node.name,
      path,
      parentId,
      hint: hintForPage(node.name, path),
    };
  };

  for (const node of menus) {
    if (isSidebarHiddenModule(node.name)) continue;
    const children = node.children ?? [];
    if (children.length > 0) {
      const pages: NavigableMenu[] = [];
      const ownPage = toPage(node, null);
      if (ownPage) pages.push(ownPage);
      for (const child of children) {
        const childPage = toPage(child, node.id);
        if (childPage) pages.push(childPage);
      }
      if (pages.length > 0) {
        groups.push({ id: node.id, name: node.name, pages });
      }
    } else {
      const page = toPage(node, null);
      if (page) standalone.push(page);
    }
  }

  if (standalone.length > 0) {
    groups.unshift({ id: "general", name: "Pages", pages: standalone });
  }
  return groups;
}

function filterTypeahead(query: string, menus: NavigableMenu[]): NavigableMenu[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const qWords = q.split(/\s+/).filter(Boolean);
  const scored = menus
    .map((m) => {
      const name = m.name.toLowerCase();
      const hint = m.hint.toLowerCase();
      let score = 0;
      if (name.startsWith(q)) score += 20;
      else if (name.includes(q)) score += 10;
      if (hint.includes(q)) score += 8;
      if (qWords.every((w) => name.includes(w) || hint.includes(w))) score += 6;
      if (m.isAction && (q.includes("add") || q.includes("cre") || q.includes("new"))) {
        score += 5;
      }
      return { m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name));

  const seen = new Set<string>();
  const unique: NavigableMenu[] = [];
  for (const { m } of scored) {
    if (seen.has(m.path)) continue;
    seen.add(m.path);
    unique.push(m);
    if (unique.length >= MAX_TYPEAHEAD) break;
  }
  return unique;
}

const AI_QUOTA_MESSAGE =
  "OpenAI quota exceeded. Add billing at platform.openai.com, then restart the API server.";

function isClearChatCommand(text: string): boolean {
  return /^(clear|reset|clear chat|clear history)$/i.test(text.trim());
}

function isGreetingCommand(text: string): boolean {
  return GREETING_RE.test(text.trim());
}

function isHelpCommand(text: string): boolean {
  return HELP_RE.test(text.trim());
}

function firstNameFromUser(fullName?: string | null): string {
  const part = fullName?.trim().split(/\s+/)[0];
  return part || "there";
}

function navigableToOptions(menus: NavigableMenu[], limit = 6): InterpretOption[] {
  return menus
    .filter((m) => !m.isAction)
    .slice(0, limit)
    .map((m) => ({
      menu_id: typeof m.id === "number" ? m.id : null,
      menu_name: m.name,
      route: m.path,
      parent_menu_id: typeof m.parentId === "number" ? m.parentId : null,
      parent_menu_name: "",
    }));
}

function greetingReply(name: string): string {
  return `Hello ${name}! I'm Campus Buddy. Pick a section below, or type a page name.`;
}

const GUIDE_INTRO =
  "Here's how to use Campus Buddy. You can do all of this on Basic and Advanced plans.";

function newClientMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function variantFromInputSource(inputSource: string | null): ChatMessage["variant"] {
  if (inputSource === "help_guide") return "guide";
  if (inputSource === "greeting") return "greeting";
  return undefined;
}

/**
 * Build greeting options based on user's permissions.
 * Shows chips for Basic Configuration, Demo Setup, Communication, and Guide.
 */
function buildGreetingOptions(grantedMenuPaths: Set<string>, hasRole: (role: string) => boolean): InterpretOption[] {
  const options: InterpretOption[] = [];

  // Basic Configuration - check if user has access to config hub
  if (grantedMenuPaths.has("/configuration/hub") || 
      grantedMenuPaths.has("/academics/academic-years") ||
      grantedMenuPaths.has("/academics/classes") ||
      grantedMenuPaths.has("/roles") ||
      grantedMenuPaths.has("/teachers") ||
      grantedMenuPaths.has("/students")) {
    options.push({
      menu_id: null,
      menu_name: "Basic Configuration",
      route: "/configuration",
      parent_menu_id: null,
      parent_menu_name: "",
    });
  }

  // Demo Setup - check if user has SUPER_ADMIN, SYSTEM_ADMIN, or ADMIN role
  if (hasRole("SUPER_ADMIN") || hasRole("SYSTEM_ADMIN") || hasRole("ADMIN")) {
    options.push({
      menu_id: null,
      menu_name: "Demo Setup",
      route: "/demo-setup-videos",
      parent_menu_id: null,
      parent_menu_name: "",
    });
  }

  // Communication - check if user has access to notices
  if (grantedMenuPaths.has("/communication/notices")) {
    options.push({
      menu_id: null,
      menu_name: "Communication",
      route: "/communication/notices",
      parent_menu_id: null,
      parent_menu_name: "",
    });
  }

  // Guide - always show this
  options.push({
    menu_id: null,
    menu_name: "Guide",
    route: "__action:guide__",
    parent_menu_id: null,
    parent_menu_name: "",
  });

  return options;
}

function buildGuideOptions(pages: NavigableMenu[]): InterpretOption[] {
  return [
    {
      menu_id: null,
      menu_name: "Show my pages",
      route: "__action:pages__",
      parent_menu_id: null,
      parent_menu_name: "",
    },
    ...(pages[0]
      ? [
          {
            menu_id: typeof pages[0].id === "number" ? pages[0].id : null,
            menu_name: `Try: ${pages[0].name}`,
            route: pages[0].path,
            parent_menu_id: typeof pages[0].parentId === "number" ? pages[0].parentId : null,
            parent_menu_name: "",
          },
        ]
      : []),
  ];
}

function restoreOptionsForMessages(
  msgs: ChatMessage[],
  pages: NavigableMenu[],
  grantedMenuPaths: Set<string>,
  hasRole: (role: string) => boolean
): Record<string, InterpretOption[]> {
  const opts: Record<string, InterpretOption[]> = {};
  for (const m of msgs) {
    if (m.role !== "assistant") continue;
    if (m.variant === "guide") {
      opts[m.id] = buildGuideOptions(pages);
    } else if (m.variant === "greeting") {
      opts[m.id] = buildGreetingOptions(grantedMenuPaths, hasRole);
    }
  }
  return opts;
}

function toChatMessage(m: ApiChatMessage): ChatMessage {
  const variant = m.role === "assistant" ? variantFromInputSource(m.input_source) : undefined;
  return {
    id: m.client_message_id || String(m.id),
    role: m.role === "assistant" ? "assistant" : "user",
    text: m.message_text,
    timestamp: new Date(m.created_at).getTime(),
    isError: m.is_error,
    variant,
  };
}

function resolveAssistantError(err: unknown): string {
  if (err && typeof err === "object") {
    const ax = err as {
      message?: string;
      code?: string;
      response?: { data?: InterpretResponse & { detail?: string } };
    };

    const body = ax.response?.data;
    if (body?.error_message?.trim()) {
      return body.error_message.trim();
    }
    if (typeof body?.detail === "string" && body.detail.trim()) {
      return body.detail.trim();
    }

    const raw = String(ax.message || "");
    const lower = raw.toLowerCase();
    if (
      lower.includes("insufficient_quota") ||
      lower.includes("quota exceeded") ||
      lower.includes("exceeded your current quota")
    ) {
      return AI_QUOTA_MESSAGE;
    }
    if (lower.includes("invalid_api_key") || lower.includes("incorrect api key") || lower.includes("api key not valid")) {
      return "Invalid OpenAI API key. Update OPENAI_API_KEY in the server .env file.";
    }
    if (lower.includes("assistant is not configured")) {
      return "Assistant is not configured. Set OPENAI_API_KEY in the FastAPI .env file.";
    }
    if (ax.code === "ECONNABORTED" || lower.includes("timeout")) {
      return "Request timed out. Check that FastAPI is running.";
    }
    if (lower.includes("network error")) {
      return "Could not reach the API server. Ensure FastAPI is running on port 8022.";
    }
    if (raw) return raw;
  }
  return "Request failed. Please try again.";
}

export default function AIAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { menus, hasPermission, hasRole } = useRBAC();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [input, setInput] = useState("");
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const [optionsById, setOptionsById] = useState<Record<string, InterpretOption[]>>({});
  const [menuListOpen, setMenuListOpen] = useState(false);
  const [showFabTooltip, setShowFabTooltip] = useState(false);
  const [highlightHeaderIcon, setHighlightHeaderIcon] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef("");
  const submittedRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserIdRef = useRef<number | null>(null);
  const pathnameWhenOpenedRef = useRef<string | null>(null);

  const closeAssistant = useCallback(() => {
    setOpen(false);
    setMenuListOpen(false);
    setHighlightHeaderIcon(false);
    setTypeaheadOpen(false);
    pathnameWhenOpenedRef.current = null;
  }, []);

  const resetChatUi = useCallback(() => {
    setMessages([]);
    setOptionsById({});
    setInput("");
    setTypeaheadOpen(false);
    setChatState("idle");
  }, []);

  const loadChat = useCallback(async () => {
    if (!user?.id) {
      setMessages([]);
      setOptionsById({});
      return;
    }
    setChatLoading(true);
    try {
      const { data } = await apiClient.get<ChatSessionResponse>("/api/ai/chat");
      const loaded = data.messages.map(toChatMessage);
      const pages = buildNavigableMenus(menus, hasPermission).filter((m) => !m.isAction);
      const grantedPaths = new Set(menus.flatMap(m => {
        const paths: string[] = [];
        const traverse = (node: MenuNode) => {
          if (node.path) paths.push(node.path);
          node.children?.forEach(traverse);
        };
        traverse(m);
        return paths;
      }));
      setMessages(loaded);
      setOptionsById(restoreOptionsForMessages(loaded, pages, grantedPaths, hasRole));
    } catch {
      // Keep in-memory messages if chat API is unavailable
    } finally {
      setChatLoading(false);
    }
  }, [user?.id, menus, hasPermission, hasRole]);

  useEffect(() => {
    const uid = user?.id ?? null;
    if (uid === lastUserIdRef.current) {
      return;
    }
    lastUserIdRef.current = uid;
    resetChatUi();
    setOpen(false);
    setMenuListOpen(false);
    if (uid) {
      void loadChat();
    }
  }, [user?.id, loadChat, resetChatUi]);

  const persistExchange = useCallback(
    async (
      userText: string,
      assistantText: string,
      opts: {
        isError?: boolean;
        route?: string;
        menuName?: string;
        parentMenuId?: number | null;
        inputSource: string;
        clientIds?: { user: string; assistant: string };
        reload?: boolean;
      }
    ) => {
      const userClientId = opts.clientIds?.user ?? newClientMessageId();
      const assistantClientId = opts.clientIds?.assistant ?? `${userClientId}-assistant`;
      const userBody: SaveChatMessageBody = {
        role: "user",
        message_text: userText,
        input_source: opts.inputSource,
        client_message_id: userClientId,
      };
      const assistantBody: SaveChatMessageBody = {
        role: "assistant",
        message_text: assistantText,
        is_error: opts.isError ?? false,
        input_source: opts.inputSource,
        client_message_id: assistantClientId,
        route: opts.route,
        menu_name: opts.menuName,
        parent_menu_id: opts.parentMenuId ?? undefined,
      };
      await apiClient.post("/api/ai/chat/messages", userBody);
      await apiClient.post("/api/ai/chat/messages", assistantBody);
      if (opts.reload !== false) {
        await loadChat();
      }
    },
    [loadChat]
  );

  const appendLocal = useCallback((role: MessageRole, text: string, isError = false) => {
    setMessages((prev) => [
      ...prev,
      { id: newClientMessageId(), role, text, timestamp: Date.now(), isError },
    ]);
  }, []);

  const navigableMenus = useMemo(
    () => buildNavigableMenus(menus, hasPermission),
    [menus, hasPermission]
  );
  const typeaheadItems = useMemo(
    () => filterTypeahead(input, navigableMenus),
    [input, navigableMenus]
  );
  const quickPicks = useMemo(
    () => navigableMenus.filter((m) => !m.isAction).slice(0, 4),
    [navigableMenus]
  );
  const menuGroups = useMemo(() => buildMenuGroups(menus), [menus]);
  const userInitial = (user?.full_name?.trim()?.[0] || "Y").toUpperCase();
  const displayName = useMemo(() => firstNameFromUser(user?.full_name), [user?.full_name]);
  const pageSuggestions = useMemo(
    () => navigableMenus.filter((m) => !m.isAction),
    [navigableMenus]
  );

  useEffect(() => {
    try {
      setShowFabTooltip(localStorage.getItem(FAB_TOOLTIP_KEY) !== "1");
    } catch {
      setShowFabTooltip(true);
    }
  }, []);

  const dismissFabTooltip = useCallback(() => {
    setShowFabTooltip(false);
    try {
      localStorage.setItem(FAB_TOOLTIP_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const attachPageOptions = useCallback((assistantId: string, pages: NavigableMenu[]) => {
    const opts = navigableToOptions(pages);
    if (opts.length > 0) {
      setOptionsById((prev) => ({ ...prev, [assistantId]: opts }));
    }
  }, []);

  const showGreetingInChat = useCallback(
    (userText: string) => {
      const userId = newClientMessageId();
      const assistantId = newClientMessageId();
      const reply = greetingReply(displayName);
      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", text: userText, timestamp: Date.now() },
        {
          id: assistantId,
          role: "assistant",
          text: reply,
          timestamp: Date.now(),
          variant: "greeting",
        },
      ]);
      // Build greeting options with Basic Configuration, Demo Setup, Communication, Guide
      const greetingChips = buildGreetingOptions(
        new Set(menus.flatMap(m => {
          const paths: string[] = [];
          const traverse = (node: MenuNode) => {
            if (node.path) paths.push(node.path);
            node.children?.forEach(traverse);
          };
          traverse(m);
          return paths;
        })),
        hasRole
      );
      setOptionsById((prev) => ({ ...prev, [assistantId]: greetingChips }));
      void persistExchange(userText, reply, {
        inputSource: "greeting",
        clientIds: { user: userId, assistant: assistantId },
        reload: false,
      }).catch(() => {});
    },
    [displayName, menus, hasRole, persistExchange]
  );

  const showGuideInChat = useCallback(
    (userText?: string) => {
      setMenuListOpen(false);
      setHighlightHeaderIcon(true);
      const spoken = userText?.trim() || "help";
      const userId = newClientMessageId();
      const assistantId = newClientMessageId();
      setMessages((prev) => [
        ...prev,
        ...(userText
          ? [{ id: userId, role: "user" as const, text: spoken, timestamp: Date.now() }]
          : []),
        {
          id: assistantId,
          role: "assistant",
          text: GUIDE_INTRO,
          timestamp: Date.now(),
          variant: "guide",
        },
      ]);
      const guideChips = buildGuideOptions(pageSuggestions);
      setOptionsById((prev) => ({ ...prev, [assistantId]: guideChips }));
      if (userText) {
        void persistExchange(spoken, GUIDE_INTRO, {
          inputSource: "help_guide",
          clientIds: { user: userId, assistant: assistantId },
          reload: false,
        }).catch(() => {});
      }
    },
    [pageSuggestions, persistExchange]
  );

  const handleFabToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        dismissFabTooltip();
        setMenuListOpen(false);
        setTypeaheadOpen(false);
        pathnameWhenOpenedRef.current = location.pathname;
      } else {
        pathnameWhenOpenedRef.current = null;
      }
      return next;
    });
  }, [dismissFabTooltip, location.pathname]);

  useEffect(() => {
    if (!open) {
      pathnameWhenOpenedRef.current = null;
      return;
    }
    if (pathnameWhenOpenedRef.current === null) {
      pathnameWhenOpenedRef.current = location.pathname;
      return;
    }
    if (location.pathname !== pathnameWhenOpenedRef.current) {
      closeAssistant();
    }
  }, [open, location.pathname, closeAssistant]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatState]);

  const executeAction = useCallback(
    async (data: InterpretResponse) => {
      if (data.action === "NAVIGATE" && data.route && !data.error_type) {
        const parentId =
          data.parent_menu_id != null
            ? String(data.parent_menu_id)
            : (ROUTE_TO_SIDEBAR_PARENT[data.route] ?? "");
        dispatchSidebarExpand(parentId);
        navigate(data.route);
        closeAssistant();
      }
    },
    [navigate, closeAssistant]
  );

  const navigateToMenu = useCallback(
    async (item: NavigableMenu, inputSource: string, userText?: string) => {
      const parentId =
        item.parentId != null
          ? String(item.parentId)
          : (ROUTE_TO_SIDEBAR_PARENT[item.path] ?? "");
      dispatchSidebarExpand(parentId);
      const spoken = userText?.trim() || `Open ${item.name}`;
      navigate(item.path);
      closeAssistant();
      try {
        await persistExchange(spoken, `Opening ${item.name}.`, {
          route: item.path,
          menuName: item.name,
          parentMenuId: typeof item.parentId === "number" ? item.parentId : null,
          inputSource,
        });
      } catch {
        appendLocal("user", spoken);
        appendLocal("assistant", `Opening ${item.name}.`);
      }
    },
    [appendLocal, navigate, persistExchange, closeAssistant]
  );

  const openPageDirect = useCallback(
    (item: NavigableMenu) => {
      setInput("");
      setTypeaheadOpen(false);
      void navigateToMenu(item, "typeahead");
    },
    [navigateToMenu]
  );

  const pickOption = useCallback(
    (messageId: string, option: InterpretOption) => {
      setOptionsById((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
      if (option.route === "__action:pages__") {
        setHighlightHeaderIcon(false);
        setMenuListOpen(true);
        return;
      }
      if (option.route === "__action:guide__") {
        showGuideInChat();
        return;
      }
      const item: NavigableMenu = {
        id: option.menu_id ?? `opt:${option.route}`,
        name: option.menu_name,
        path: option.route,
        parentId: typeof option.parent_menu_id === "number" ? option.parent_menu_id : null,
        hint: "",
      };
      void navigateToMenu(item, "option_pick");
    },
    [navigateToMenu, showGuideInChat]
  );

  const openFromList = useCallback(
    (item: NavigableMenu) => {
      setMenuListOpen(false);
      void navigateToMenu(item, "menu_list");
    },
    [navigateToMenu]
  );

  const submitText = useCallback(
    async (text: string, inputSource = "text") => {
      const trimmed = text.trim();
      if (!trimmed || chatState === "processing") return;

      if (isClearChatCommand(trimmed)) {
        setInput("");
        setTypeaheadOpen(false);
        setChatState("processing");
        try {
          await apiClient.delete("/api/ai/chat");
          await persistExchange(trimmed, "Chat cleared. Where would you like to go?", {
            inputSource: "clear_command",
          });
        } catch {
          setMessages([
            {
              id: newClientMessageId(),
              role: "user",
              text: trimmed,
              timestamp: Date.now(),
            },
            {
              id: newClientMessageId(),
              role: "assistant",
              text: "Chat cleared. Where would you like to go?",
              timestamp: Date.now(),
            },
          ]);
        } finally {
          setChatState("idle");
        }
        return;
      }

      setInput("");
      setTypeaheadOpen(false);
      setChatState("processing");

      if (isGreetingCommand(trimmed)) {
        showGreetingInChat(trimmed);
        setChatState("idle");
        return;
      }

      if (isHelpCommand(trimmed)) {
        showGuideInChat(trimmed);
        setChatState("idle");
        return;
      }

      setOptionsById({});

      const exact = navigableMenus.find(
        (m) =>
          m.name.toLowerCase() === trimmed.toLowerCase() ||
          m.hint.toLowerCase() === trimmed.toLowerCase()
      );
      if (exact) {
        await navigateToMenu(exact, inputSource, trimmed);
        setChatState("idle");
        return;
      }

      try {
        const clientMessageId = newClientMessageId();
        const { data } = await apiClient.post<InterpretResponse>(
          "/api/ai/interpret",
          {
            user_text: trimmed,
            input_source: inputSource,
            client_message_id: clientMessageId,
          },
          { timeout: 90000 }
        );
        await executeAction(data);
        await loadChat();
        if (data.error_type && data.options && data.options.length > 0) {
          const assistantId = `${clientMessageId}-assistant`;
          setOptionsById((prev) => ({ ...prev, [assistantId]: data.options ?? [] }));
        }
      } catch (err: unknown) {
        appendLocal("assistant", resolveAssistantError(err), true);
      } finally {
        setChatState("idle");
      }
    },
    [chatState, appendLocal, executeAction, navigableMenus, navigateToMenu, persistExchange, loadChat, showGreetingInChat, showGuideInChat]
  );

  const handleSend = useCallback(() => {
    submitText(input);
  }, [input, submitText]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setTypeaheadOpen(value.trim().length > 0);
  }, []);

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
      transcriptRef.current = (transcriptRef.current ? `${transcriptRef.current} ${t}` : t).trim();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setChatState((s) => (s === "listening" ? "idle" : s));
      if (submittedRef.current) return;
      const transcript = transcriptRef.current;
      if (transcript.trim() === "") return;
      submittedRef.current = true;
      submitText(transcript, "voice");
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
      {showFabTooltip && !open && (
        <FabTooltipCard elevation={0}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Campus Buddy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, lineHeight: 1.45 }}>
            Your school navigation helper. Tap to find pages, type where you want to go, or use voice.
          </Typography>
          <Box
            component="button"
            type="button"
            onClick={dismissFabTooltip}
            sx={{
              border: "none",
              cursor: "pointer",
              borderRadius: "10px",
              px: 1.5,
              py: 0.75,
              fontWeight: 700,
              fontSize: "0.8125rem",
              color: "#fff",
              bgcolor: P.turquoise.main,
            }}
          >
            Got it
          </Box>
        </FabTooltipCard>
      )}

      <FabButton
        onClick={handleFabToggle}
        sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1300 }}
        aria-label={open ? "Close Campus Buddy" : "Open Campus Buddy"}
        aria-expanded={open}
      >
        {open ? (
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: brandGradient,
              border: `2px solid #ffffff`,
              boxShadow: `0 6px 16px ${alpha(PRIMARY.main, 0.3)}`,
            }}
          >
            <CloseIcon sx={{ fontSize: 22, color: "#fff" }} />
          </Box>
        ) : (
          <CampusBuddyMascot size={64} badge listening={listening} processing={processing} />
        )}
      </FabButton>

      <Collapse
        in={open}
        sx={{ position: "fixed", bottom: 0, right: 0, zIndex: 1299, transformOrigin: "bottom right" }}
      >
        <PanelRoot elevation={0}>
          <PanelHeader>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, position: "relative", zIndex: 1 }}>
              <IconButton
                onClick={() => {
                  setHighlightHeaderIcon(false);
                  setMenuListOpen((v) => !v);
                }}
                aria-label={menuListOpen ? "Back to chat" : "Show my pages"}
                title={menuListOpen ? "Back to chat" : "My pages"}
                sx={{
                  p: 0,
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  overflow: "visible",
                  position: "relative",
                  transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transform: menuListOpen ? "scale(1.05)" : "scale(1)",
                  "&:hover": { transform: "scale(1.08)" },
                }}
              >
                {highlightHeaderIcon && <PulseRing />}
                <CampusBuddyMascot
                  size={56}
                  badge
                  active={menuListOpen}
                  listening={listening}
                  processing={processing}
                />
              </IconButton>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                  Campus Buddy
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {menuListOpen
                    ? "Tap a page to go there"
                    : highlightHeaderIcon
                      ? "Tap my icon above to see your pages"
                      : "Ask me where you want to go"}
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={closeAssistant}
              sx={{
                position: "relative",
                zIndex: 1,
                color: "#ffffff",
                bgcolor: alpha("#ffffff", 0.18),
                border: `1.5px solid ${alpha("#ffffff", 0.35)}`,
                "&:hover": { bgcolor: alpha("#ffffff", 0.28) },
              }}
              aria-label="Close"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </PanelHeader>

          {menuListOpen ? (
            <ChatScrollArea>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ color: colorTokens.sidebar.text.primary, px: 0.5, mb: 0.5 }}
              >
                My pages
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, mb: 1.25, display: "block" }}>
                These are the screens you can open. Tap any one to go there.
              </Typography>

              {menuGroups.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No pages are available for your account yet.
                  </Typography>
                </Box>
              ) : (
                menuGroups.map((group) => (
                  <Box key={group.id} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 0.5, mb: 0.75 }}>
                      <FolderRoundedIcon sx={{ fontSize: 16, color: P.turquoise.main }} />
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{
                          color: colorTokens.sidebar.text.secondary,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {group.name}
                      </Typography>
                    </Box>
                    {group.pages.map((item) => (
                      <TypeaheadRow
                        key={`${item.id}-${item.path}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openFromList(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openFromList(item);
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            bgcolor: alpha(P.turquoise.main, 0.12),
                            color: P.turquoise.dark,
                          }}
                        >
                          <ChevronRightIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {item.hint}
                          </Typography>
                        </Box>
                        <ChevronRightIcon sx={{ color: colorTokens.sidebar.text.muted, fontSize: 18 }} />
                      </TypeaheadRow>
                    ))}
                  </Box>
                ))
              )}
            </ChatScrollArea>
          ) : (
          <>
          <ChatScrollArea>
            {chatLoading && messages.length === 0 && (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25, py: 3 }}>
                <CircularProgress size={22} sx={{ color: P.turquoise.main }} />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Loading your chat…
                </Typography>
              </Box>
            )}

            {messages.length === 0 && !chatLoading && (
              <WelcomeCard>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1.25 }}>
                  <CampusBuddyMascot
                    size={88}
                    badge
                    active={menuListOpen}
                    listening={listening}
                    processing={processing}
                  />
                </Box>
                <Typography variant="subtitle2" fontWeight={700} color={colorTokens.sidebar.text.primary} gutterBottom>
                  Hi, {displayName}!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.75, lineHeight: 1.5, px: 1 }}>
                  I can help you open screens in your school app. Type a page name, pick a suggestion, or use the mic.
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "center", mb: quickPicks.length > 0 ? 0.75 : 0 }}>
                  <SuggestionChip
                    onClick={() => {
                      setHighlightHeaderIcon(true);
                      setMenuListOpen(true);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <ListAltIcon sx={{ fontSize: 14, color: P.turquoise.main }} />
                    Show my pages
                  </SuggestionChip>
                  <SuggestionChip
                    onClick={() => showGuideInChat()}
                    role="button"
                    tabIndex={0}
                  >
                    <HelpOutlineIcon sx={{ fontSize: 14, color: P.turquoise.main }} />
                    How do I use this?
                  </SuggestionChip>
                </Box>
                {quickPicks.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "center" }}>
                    {quickPicks.slice(0, 3).map((item) => (
                      <SuggestionChip
                        key={item.path}
                        onClick={() => openPageDirect(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openPageDirect(item);
                          }
                        }}
                      >
                        <ChevronRightIcon sx={{ fontSize: 14, color: P.turquoise.main }} />
                        {item.name}
                      </SuggestionChip>
                    ))}
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.25 }}>
                  Tip: type &quot;help&quot; anytime for a quick guide.
                </Typography>
              </WelcomeCard>
            )}

            {messages.map((m) => {
              const isUser = m.role === "user";
              const options = !isUser ? optionsById[m.id] : undefined;
              return (
                <Box key={m.id} sx={{ mb: 1.25 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: isUser ? "row-reverse" : "row",
                      alignItems: "flex-end",
                      gap: 0.75,
                    }}
                  >
                    {isUser ? (
                      <BuddyAvatar variant="user">{userInitial}</BuddyAvatar>
                    ) : m.isError ? (
                      <BuddyAvatar variant="error">!</BuddyAvatar>
                    ) : (
                      <CampusBuddyMascot size={34} compact badge />
                    )}
                    <MessageBubble isUser={isUser} isError={m.isError}>
                      {m.variant === "guide" ? (
                        <Box>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: colorTokens.sidebar.text.primary, mb: 1 }}
                          >
                            How to use Campus Buddy
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, lineHeight: 1.45 }}>
                            {m.text}
                          </Typography>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
                              <TapHintIcon sx={{ fontSize: 18, mt: 0.15 }} />
                              <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                                Tap To Campus Buddy Icon at the top-left of this panel to open <strong>My pages</strong>.
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                              2. Tap any page in the list to go there instantly.
                            </Typography>
                            <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                              3. Type in the box below (e.g. &quot;attendance&quot;, &quot;teachers&quot;).
                            </Typography>
                            <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                              4. Pick a suggestion while typing, or tap the mic for voice.
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            color: m.isError ? colorTokens.error.dark : colorTokens.sidebar.text.primary,
                            fontWeight: isUser ? 600 : 400,
                            lineHeight: 1.45,
                          }}
                        >
                          {m.text}
                        </Typography>
                      )}
                    </MessageBubble>
                  </Box>
                  {options && options.length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75, ml: 4.5 }}>
                      {options.map((o) => (
                        <SuggestionChip
                          key={`${m.id}-${o.route}`}
                          onClick={() => pickOption(m.id, o)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              pickOption(m.id, o);
                            }
                          }}
                        >
                          <ChevronRightIcon sx={{ fontSize: 14, color: P.turquoise.main }} />
                          {o.menu_name}
                        </SuggestionChip>
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}

            {listening && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.75,
                  px: 1.25,
                  borderRadius: 15,
                  bgcolor: alpha(P.turquoise.main, 0.08),
                  border: `1px solid ${alpha(P.turquoise.main, 0.2)}`,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: P.turquoise.main,
                    animation: "buddyPulse 1s ease-in-out infinite",
                    "@keyframes buddyPulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.4 } },
                  }}
                />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  I&apos;m listening…
                </Typography>
              </Box>
            )}
            {processing && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.75,
                  px: 1.25,
                  borderRadius: 15,
                  bgcolor: alpha(PRIMARY.main, 0.06),
                  border: `1px solid ${alpha(PRIMARY.main, 0.15)}`,
                }}
              >
                <CircularProgress size={18} sx={{ color: P.turquoise.main }} />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Looking for that page…
                </Typography>
              </Box>
            )}
            <div ref={listEndRef} />
          </ChatScrollArea>

          <InputFooter>
            {typeaheadOpen && typeaheadItems.length > 0 && !processing && (
              <TypeaheadPanel elevation={0}>
                {typeaheadItems.map((item) => (
                  <TypeaheadRow
                    key={`${item.id}-${item.path}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      openPageDirect(item);
                    }}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        bgcolor: alpha(P.turquoise.main, item.isAction ? 0.18 : 0.12),
                        color: item.isAction ? PRIMARY.main : P.turquoise.dark,
                      }}
                    >
                      <ChevronRightIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {item.hint}
                      </Typography>
                    </Box>
                    <ChevronRightIcon sx={{ color: colorTokens.sidebar.text.muted, fontSize: 18 }} />
                  </TypeaheadRow>
                ))}
              </TypeaheadPanel>
            )}
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Try: teachers, attendance, fee setup…"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => input.trim() && setTypeaheadOpen(true)}
                onBlur={() => setTimeout(() => setTypeaheadOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (typeaheadItems.length === 1) {
                      openPageDirect(typeaheadItems[0]);
                    } else {
                      handleSend();
                    }
                  }
                }}
                disabled={processing}
                multiline
                maxRows={2}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "15px",
                    bgcolor: alpha("#ffffff", 0.95),
                    "& fieldset": {
                      borderColor: alpha(P.turquoise.main, 0.2),
                    },
                    "&:hover fieldset": {
                      borderColor: P.turquoise.main,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: P.turquoise.main,
                      boxShadow: `0 0 0 3px ${alpha(P.turquoise.main, 0.1)}`,
                    },
                  },
                }}
              />
              <IconButton
                onClick={startListening}
                disabled={processing}
                title="Speak to Campus Buddy"
                aria-label="Voice input"
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: listening ? alpha(P.turquoise.main, 0.15) : alpha("#ffffff", 0.9),
                  color: listening ? P.turquoise.dark : colorTokens.sidebar.text.secondary,
                  border: `1px solid ${alpha(P.turquoise.main, 0.22)}`,
                  "&:hover": { bgcolor: alpha(P.turquoise.main, 0.08) },
                  ...(listening
                    ? {
                        boxShadow: `0 0 0 3px ${alpha(P.turquoise.main, 0.12)}`,
                      }
                    : {}),
                }}
              >
                <MicIcon fontSize="small" />
              </IconButton>
              <IconButton
                onClick={handleSend}
                disabled={processing || !input.trim()}
                title="Go!"
                aria-label="Send"
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: P.turquoise.main,
                  color: "#ffffff",
                  boxShadow: `0 4px 12px ${alpha(P.turquoise.main, 0.28)}`,
                  "&:hover": { bgcolor: P.turquoise.dark },
                  "&.Mui-disabled": {
                    bgcolor: alpha(P.turquoise.main, 0.35),
                    color: alpha("#ffffff", 0.8),
                    boxShadow: "none",
                  },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </InputFooter>
          </>
          )}
        </PanelRoot>
      </Collapse>
    </>
  );
}
