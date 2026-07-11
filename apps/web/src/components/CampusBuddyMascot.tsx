/**
 * Campus Buddy — Animated Chatbot Icon
 * Uses animated GIF for eye-catching visual appeal
 */
import { Box, alpha, styled, keyframes } from "@mui/material";
import { colorTokens } from "../tokens/colors";

const P = colorTokens.preschool;
const PRIMARY = colorTokens.primary;

// Floating animation
const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-6px) scale(1.02); }
`;

// Pulsing glow effect
const glowPulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 0.9; transform: scale(1.1); }
`;

// Ring expansion
const ringExpand = keyframes`
  0% { transform: scale(0.9); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
`;

// Spin animation for processing
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// Shimmer effect
const shimmer = keyframes`
  0% { transform: translateX(-100%) rotate(-45deg); }
  100% { transform: translateX(200%) rotate(-45deg); }
`;

// Scale pulse for active state
const scalePulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

const MascotShell = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "active" &&
    prop !== "listening" &&
    prop !== "processing" &&
    prop !== "compact" &&
    prop !== "badge",
})<{
  active?: boolean;
  listening?: boolean;
  processing?: boolean;
  compact?: boolean;
  badge?: boolean;
}>(({ active, listening, processing, compact, badge }) => ({
  position: "relative",
  flexShrink: 0,
  cursor: "pointer",

  // Base background - removed, using transparent
  "& .icon-bg": {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background: "transparent",
    border: badge ? `3px solid ${alpha("#ffffff", 0.2)}` : "none",
    boxShadow: badge
      ? `0 10px 35px ${alpha(P.turquoise.main, 0.3)}, 0 5px 18px ${alpha(PRIMARY.main, 0.2)}`
      : `0 8px 24px ${alpha(PRIMARY.main, 0.25)}`,
    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },

  // Glow effect
  "& .icon-glow": {
    position: "absolute",
    inset: compact ? 2 : -4,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${alpha(P.turquoise.light, 0.4)} 0%, transparent 70%)`,
    animation: `${glowPulse} ${processing ? "1.2s" : listening ? "1.8s" : "3s"} ease-in-out infinite`,
    display: compact ? "none" : "block",
    filter: "blur(10px)",
  },

  // Listening rings
  "& .listen-ring": {
    position: "absolute",
    inset: -5,
    borderRadius: "50%",
    border: `3px solid ${P.turquoise.light}`,
    display: listening ? "block" : "none",
    animation: `${ringExpand} 1.5s ease-out infinite`,
  },

  "& .listen-ring-2": {
    border: `2px solid ${alpha(P.lavender.main, 0.8)}`,
    animationDelay: "0.5s",
  },

  // Processing spinner
  "& .process-ring": {
    position: "absolute",
    inset: -2,
    borderRadius: "50%",
    border: `3px solid transparent`,
    borderTopColor: P.turquoise.main,
    borderRightColor: alpha(P.lavender.main, 0.7),
    display: processing ? "block" : "none",
    animation: `${spin} 1s linear infinite`,
  },

  // Shimmer overlay
  "& .shimmer": {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    overflow: "hidden",
    opacity: listening || processing ? 0.6 : 0,
    transition: "opacity 0.3s",
    "&::after": {
      content: '""',
      position: "absolute",
      top: "-50%",
      left: "-50%",
      width: "50%",
      height: "200%",
      background: `linear-gradient(90deg, transparent, ${alpha("#ffffff", 0.4)}, transparent)`,
      animation: `${shimmer} 2s infinite`,
    },
  },

  // GIF image container
  "& .chatbot-image": {
    position: "relative",
    zIndex: 2,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: compact ? "none" : `${floatAnimation} 3s ease-in-out infinite`,
    "& img": {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      transform: active ? "scale(1.05)" : "scale(1)",
      transition: "transform 0.3s ease",
      animation: active ? `${scalePulse} 2s ease-in-out infinite` : "none",
      borderRadius: "50%",
    },
  },

  // Hover effect
  "&:hover": {
    "& .icon-bg": {
      transform: "scale(1.05)",
      boxShadow: badge
        ? `0 14px 45px ${alpha(P.turquoise.main, 0.4)}, 0 7px 22px ${alpha(PRIMARY.main, 0.3)}`
        : `0 10px 32px ${alpha(PRIMARY.main, 0.35)}`,
    },
    "& .chatbot-image img": {
      transform: "scale(1.08)",
    },
  },
}));

export interface CampusBuddyMascotProps {
  size?: number;
  active?: boolean;
  listening?: boolean;
  processing?: boolean;
  compact?: boolean;
  badge?: boolean;
}

export default function CampusBuddyMascot({
  size = 48,
  active = false,
  listening = false,
  processing = false,
  compact = false,
  badge = false,
}: CampusBuddyMascotProps) {
  return (
    <MascotShell
      active={active}
      listening={listening}
      processing={processing}
      compact={compact}
      badge={badge}
      sx={{ width: size, height: size }}
      aria-hidden
    >
      {!compact && <Box className="icon-glow" />}
      <Box className="icon-bg" />
      {(listening || processing) && <Box className="shimmer" />}
      
      {listening && (
        <>
          <Box className="listen-ring" />
          <Box className="listen-ring listen-ring-2" />
        </>
      )}
      
      {processing && <Box className="process-ring" />}

      <Box className="chatbot-image">
        <img 
          src="/assets/chatbot.gif" 
          alt="Campus Buddy Chatbot"
          draggable="false"
        />
      </Box>
    </MascotShell>
  );
}
