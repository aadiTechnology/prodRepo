/**
 * PullToRefresh — UI Primitive
 * Flipkart/Amazon-style full-page pull-to-refresh for Capacitor mobile (touch only).
 * After refresh completes, content and indicator always snap back up.
 */

import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import CircularProgress from "./CircularProgress";
import { Box } from "./Box";
import { colorTokens } from "../../tokens/colors";

export type PullToRefreshProps = {
  children: ReactNode;
  onRefresh: () => void | Promise<void>;
  /** Controlled refreshing. If omitted, local state runs while the promise settles. */
  refreshing?: boolean;
  disabled?: boolean;
  /** Pull distance (px) required to trigger refresh. Default 72. */
  threshold?: number;
};

const MAX_PULL = 120;
const RESISTANCE = 0.5;
const REFRESHING_HOLD = 56;
/** Minimum time to show the spinner so it doesn't flash and look stuck mid-frame. */
const MIN_REFRESH_MS = 450;

function isScrollable(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  return (
    (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
    el.scrollHeight > el.clientHeight + 1
  );
}

function findScrollParent(start: EventTarget | null): HTMLElement | null {
  if (!(start instanceof Element)) return null;
  let node: HTMLElement | null = start instanceof HTMLElement ? start : start.parentElement;
  while (node && node !== document.body) {
    if (isScrollable(node)) return node;
    node = node.parentElement;
  }
  return null;
}

function findPageScrollHost(from: HTMLElement | null): HTMLElement {
  let node: HTMLElement | null = from;
  while (node && node !== document.body) {
    if (node.tagName === "MAIN" || node.getAttribute("data-ptr-scroll") === "page") {
      return node;
    }
    if (isScrollable(node) && node.scrollHeight > node.clientHeight + 1) {
      const parent = node.parentElement;
      let outer: HTMLElement | null = parent;
      while (outer && outer !== document.body) {
        if (outer.tagName === "MAIN") return outer;
        outer = outer.parentElement;
      }
      return node;
    }
    node = node.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

function isAtScrollTop(el: HTMLElement | null): boolean {
  if (!el) return true;
  return el.scrollTop <= 1;
}

function canStartPagePull(root: HTMLElement | null, target: EventTarget | null): boolean {
  const pageHost = findPageScrollHost(root);
  if (!isAtScrollTop(pageHost)) return false;

  const nested = findScrollParent(target);
  if (nested && nested !== pageHost && root?.contains(nested)) {
    return isAtScrollTop(nested);
  }
  return true;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function PullToRefresh({
  children,
  onRefresh,
  refreshing: refreshingProp,
  disabled = false,
  threshold = 72,
}: PullToRefreshProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pullStartY = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const pulling = useRef(false);
  const armed = useRef(false);
  const inFlight = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const isControlled = refreshingProp !== undefined;
  const refreshing = isControlled ? Boolean(refreshingProp) : localRefreshing;

  const showIndicator = pullDistance > 0 || refreshing;
  const indicatorProgress = Math.min(1, pullDistance / threshold);

  const setPull = useCallback((value: number) => {
    pullDistanceRef.current = value;
    setPullDistance(value);
  }, []);

  const clearGesture = useCallback(() => {
    pulling.current = false;
    armed.current = false;
    pullStartY.current = null;
  }, []);

  const resetPull = useCallback(() => {
    clearGesture();
    setPull(0);
  }, [clearGesture, setPull]);

  const runRefresh = useCallback(async () => {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    clearGesture();
    setPull(REFRESHING_HOLD);

    const startedAt = Date.now();
    if (!isControlled) {
      setLocalRefreshing(true);
    }

    try {
      await Promise.resolve(onRefresh());
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_REFRESH_MS) {
        await wait(MIN_REFRESH_MS - elapsed);
      }
    } catch {
      // Still collapse UI after a failed refresh
    } finally {
      inFlight.current = false;
      if (!isControlled) {
        setLocalRefreshing(false);
      }
      // Always send content + indicator back up
      setPull(0);
      clearGesture();
    }
  }, [clearGesture, disabled, isControlled, onRefresh, setPull]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || refreshing || inFlight.current) return;
      // Mobile touch only — no pull-to-refresh on desktop/web mouse drag
      if (event.pointerType !== "touch") return;
      if (!canStartPagePull(rootRef.current, event.target)) return;

      pullStartY.current = event.clientY;
      pulling.current = true;
      armed.current = false;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    },
    [disabled, refreshing]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pulling.current || pullStartY.current == null || disabled || refreshing || inFlight.current) {
        return;
      }

      const delta = event.clientY - pullStartY.current;
      if (delta <= 0) {
        if (armed.current) {
          setPull(0);
          armed.current = false;
        }
        return;
      }

      if (!armed.current && !canStartPagePull(rootRef.current, event.target)) {
        resetPull();
        return;
      }

      armed.current = true;
      const resisted = Math.min(MAX_PULL, delta * RESISTANCE);
      setPull(resisted);

      if (resisted > 8) {
        event.preventDefault();
      }
    },
    [disabled, refreshing, resetPull, setPull]
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pulling.current) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }

      if (inFlight.current || refreshing || disabled) {
        resetPull();
        return;
      }

      const shouldRefresh = pullDistanceRef.current >= threshold;
      if (shouldRefresh) {
        void runRefresh();
      } else {
        resetPull();
      }
    },
    [disabled, refreshing, resetPull, runRefresh, threshold]
  );

  const onLostPointerCapture = useCallback(() => {
    // If the browser drops capture mid-drag and we are not refreshing, collapse.
    if (!inFlight.current && !refreshing) {
      resetPull();
    }
  }, [refreshing, resetPull]);

  // Controlled mode: when parent clears refreshing, always collapse.
  useEffect(() => {
    if (isControlled && refreshingProp === false) {
      inFlight.current = false;
      resetPull();
    }
  }, [isControlled, refreshingProp, resetPull]);

  const contentStyle: CSSProperties = {
    transform: pullDistance > 0 || refreshing ? `translateY(${refreshing ? Math.max(pullDistance, REFRESHING_HOLD) : pullDistance}px)` : undefined,
    transition: pulling.current ? undefined : "transform 220ms ease-out",
    willChange: pullDistance > 0 || refreshing ? "transform" : undefined,
  };

  return (
    <Box
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={onLostPointerCapture}
      sx={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overscrollBehaviorY: "contain",
        touchAction: "pan-x pan-y",
      }}
    >
      <Box
        aria-hidden={!showIndicator}
        sx={{
          position: "sticky",
          top: 0,
          left: 0,
          right: 0,
          height: 0,
          zIndex: 20,
          pointerEvents: "none",
          display: "flex",
          justifyContent: "center",
          // Hard-hide when idle so the icon cannot "stick" visually
          visibility: showIndicator ? "visible" : "hidden",
        }}
      >
        <Box
          sx={{
            mt: 1,
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: colorTokens.background.paper,
            boxShadow: showIndicator ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: showIndicator ? (refreshing ? 1 : Math.max(0.35, indicatorProgress)) : 0,
            transform: `translateY(${refreshing ? 4 : Math.max(0, pullDistance - 28)}px) scale(${
              showIndicator ? 0.75 + indicatorProgress * 0.25 : 0.75
            })`,
            transition: pulling.current
              ? undefined
              : "opacity 180ms ease, transform 220ms ease, visibility 180ms ease",
          }}
        >
          {refreshing ? (
            <CircularProgress size={20} sx={{ color: colorTokens.primary.main }} />
          ) : (
            <RefreshIcon
              sx={{
                fontSize: 20,
                color: colorTokens.primary.main,
                transform: `rotate(${indicatorProgress * 180}deg)`,
              }}
            />
          )}
        </Box>
      </Box>

      <Box
        style={contentStyle}
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
