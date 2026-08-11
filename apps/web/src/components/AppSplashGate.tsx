/**
 * Coordinates native Capacitor splash → React SmartKidz splash → app UI.
 *
 * Ready signal: AuthProvider `isLoading === false` (session/token bootstrap).
 * Does not alter auth/session logic; only gates first-paint branding.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../context";
import { isNativePlatform } from "../utils/capacitor";
import SmartKidzSplash from "./SmartKidzSplash";

/** Minimum time for the full intro sequence (icon → logo → tagline) to read. */
const MIN_BRAND_MS = 1850;
/** Exit fade duration — keep in sync with SmartKidzSplash.css transition. */
const EXIT_MS = 400;

type Phase = "visible" | "exiting" | "done";

async function hideNativeSplash(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {
    // Already hidden or plugin unavailable (browser / older WebView)
  }
}

type AppSplashGateProps = {
  children: ReactNode;
};

export default function AppSplashGate({ children }: AppSplashGateProps) {
  const { isLoading } = useAuth();
  const startedAtRef = useRef(Date.now());
  const [phase, setPhase] = useState<Phase>("visible");
  const [initPastIntro, setInitPastIntro] = useState(false);

  // Hand off from native splash as soon as React splash paints.
  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) void hideNativeSplash();
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  // Soft progress cue if auth is still working after the brand intro.
  useEffect(() => {
    if (!isLoading || phase !== "visible") return;
    const t = window.setTimeout(() => setInitPastIntro(true), MIN_BRAND_MS);
    return () => window.clearTimeout(t);
  }, [isLoading, phase]);

  // Start exit when auth is ready AND minimum brand time has elapsed.
  useEffect(() => {
    if (isLoading || phase !== "visible") return;

    const elapsed = Date.now() - startedAtRef.current;
    const wait = Math.max(0, MIN_BRAND_MS - elapsed);
    const t = window.setTimeout(() => setPhase("exiting"), wait);
    return () => window.clearTimeout(t);
  }, [isLoading, phase]);

  // Unmount splash after exit animation.
  useEffect(() => {
    if (phase !== "exiting") return;
    const t = window.setTimeout(() => setPhase("done"), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <>
      {children}
      {phase !== "done" ? (
        <SmartKidzSplash
          exiting={phase === "exiting"}
          showProgress={isLoading && initPastIntro}
        />
      ) : null}
    </>
  );
}
