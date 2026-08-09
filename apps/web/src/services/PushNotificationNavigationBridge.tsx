/**
 * Bridges native FCM notification taps to the existing React Router.
 *
 * Mount inside BrowserRouter + AuthProvider. When auth bootstrap finishes
 * (`!isLoading`), any path retained from a cold-start / early tap is delivered
 * via `navigate`. After login (`isAuthenticated`), a retained path is flushed
 * again so post-login resume works even if Login `location.state` was lost.
 * Does not introduce a parallel navigation system.
 *
 * Client registration updates in place when auth flags change so a cleanup→null
 * gap cannot drop a pending cold-start navigation mid-auth.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { isNativePlatform } from "../utils/capacitor";
import { setPushNavigationClient } from "./pushNotificationService";

export default function PushNotificationNavigationBridge() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useAuth();

  // Unmount-only cleanup — do not clear the client on every auth flag flip.
  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }
    return () => {
      setPushNavigationClient(null);
    };
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    setPushNavigationClient({
      isReady: !isLoading,
      isAuthenticated,
      navigate: (path: string) => {
        // Replace so notification resume does not leave intermediate history noise.
        navigate(path, { replace: true });
      },
    });
  }, [isLoading, isAuthenticated, navigate]);

  return null;
}
