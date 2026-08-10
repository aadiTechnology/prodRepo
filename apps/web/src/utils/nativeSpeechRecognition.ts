import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";

export type NativeSpeechFailure =
  | "permission_denied"
  | "unavailable"
  | "no_speech"
  | "error"
  | "user_cancelled";

export type NativeSpeechSessionResult =
  | { ok: true; transcript: string }
  | { ok: false; failure: NativeSpeechFailure; message: string };

export function userMessageForSpeechFailure(
  failure: NativeSpeechFailure,
  detail?: string
): string {
  switch (failure) {
    case "permission_denied":
      return "Microphone permission is required for voice chat. Enable it in App Settings → Permissions.";
    case "unavailable":
      return "Voice chat is not available on this device. Please type your message instead.";
    case "no_speech":
      return "I didn't catch any speech. Tap the microphone and try again.";
    case "user_cancelled":
      return "";
    case "error":
    default:
      return detail?.trim()
        ? `Voice recognition failed: ${detail.trim()}`
        : "Voice recognition failed. Please try again or type your message.";
  }
}

function mapErrorCodeToFailure(
  code: string,
  message: string
): { failure: NativeSpeechFailure; message: string } {
  const c = (code || "").toLowerCase();
  const m = (message || "").toLowerCase();

  if (c.includes("permission") || c.includes("insufficient") || m.includes("permission")) {
    return {
      failure: "permission_denied",
      message: userMessageForSpeechFailure("permission_denied"),
    };
  }

  // Android SpeechRecognizer codes are often numeric strings:
  // 6 = ERROR_SPEECH_TIMEOUT, 7 = ERROR_NO_MATCH
  if (
    c === "6" ||
    c === "7" ||
    c.includes("no_match") ||
    c.includes("nomatch") ||
    c.includes("no_speech") ||
    c.includes("nospeech") ||
    c.includes("speech_timeout") ||
    c.includes("timeout") ||
    m.includes("no match") ||
    m.includes("no speech") ||
    m.includes("didn't hear") ||
    m.includes("did not hear")
  ) {
    return {
      failure: "no_speech",
      message: userMessageForSpeechFailure("no_speech"),
    };
  }

  return {
    failure: "error",
    message: userMessageForSpeechFailure("error", message || code),
  };
}

function bestTranscript(parts: {
  matches?: string[];
  accumulatedText?: string;
  accumulated?: string;
  text?: string;
}): string {
  return (
    parts.accumulatedText?.trim() ||
    parts.matches?.[0]?.trim() ||
    parts.accumulated?.trim() ||
    parts.text?.trim() ||
    ""
  );
}

export type NativeSpeechSessionHandle = {
  /** Stop recognition. Pass intentional:true when the user cancels (e.g. second mic tap). */
  stop: (opts?: { intentional?: boolean }) => void;
};

/**
 * Start native speech recognition (Capacitor Android/iOS via Capgo plugin).
 * Permissions are requested through the plugin (RECORD_AUDIO on Android).
 */
export async function startNativeSpeechSession(options: {
  language?: string;
  onPartial?: (text: string) => void;
  onComplete: (result: NativeSpeechSessionResult) => void;
}): Promise<NativeSpeechSessionHandle | null> {
  let finished = false;
  let transcript = "";
  let intentionalCancel = false;
  const language = options.language ?? "en-US";

  const finish = async (result: NativeSpeechSessionResult) => {
    if (finished) return;
    finished = true;
    try {
      await SpeechRecognition.removeAllListeners();
    } catch {
      // ignore cleanup errors
    }
    try {
      const { listening } = await SpeechRecognition.isListening();
      if (listening) {
        await SpeechRecognition.stop().catch(() => undefined);
      }
    } catch {
      // ignore cleanup errors
    }
    options.onComplete(result);
  };

  try {
    const { available } = await SpeechRecognition.available();
    if (!available) {
      await finish({
        ok: false,
        failure: "unavailable",
        message: userMessageForSpeechFailure("unavailable"),
      });
      return null;
    }

    let status = await SpeechRecognition.checkPermissions();
    if (status.speechRecognition !== "granted") {
      status = await SpeechRecognition.requestPermissions();
    }
    if (status.speechRecognition !== "granted") {
      await finish({
        ok: false,
        failure: "permission_denied",
        message: userMessageForSpeechFailure("permission_denied"),
      });
      return null;
    }

    await SpeechRecognition.removeAllListeners().catch(() => undefined);

    await SpeechRecognition.addListener("partialResults", (event) => {
      const text = bestTranscript(event);
      if (text) {
        transcript = text;
        options.onPartial?.(text);
      }
    });

    await SpeechRecognition.addListener("error", (event) => {
      const mapped = mapErrorCodeToFailure(event.code, event.message);
      void finish({
        ok: false,
        failure: mapped.failure,
        message: mapped.message,
      });
    });

    await SpeechRecognition.addListener("listeningState", (event) => {
      const stopped = event.status === "stopped" || event.state === "stopped";
      if (!stopped) return;

      if (event.reason === "error") {
        if (event.errorCode) {
          const mapped = mapErrorCodeToFailure(event.errorCode, event.errorCode);
          void finish({
            ok: false,
            failure: mapped.failure,
            message: mapped.message,
          });
        }
        return;
      }

      const text = transcript.trim();
      if (text) {
        void finish({ ok: true, transcript: text });
        return;
      }

      // Empty transcript: intentional mic cancel stays silent; silence/timeout → no_speech.
      if (intentionalCancel) {
        void finish({
          ok: false,
          failure: "user_cancelled",
          message: "",
        });
        return;
      }

      void finish({
        ok: false,
        failure: "no_speech",
        message: userMessageForSpeechFailure("no_speech"),
      });
    });

    await SpeechRecognition.start({
      language,
      maxResults: 5,
      partialResults: true,
      popup: false,
    });

    return {
      stop: (opts) => {
        if (opts?.intentional) intentionalCancel = true;
        void (async () => {
          try {
            const last = await SpeechRecognition.getLastPartialResult();
            const text = bestTranscript(last);
            if (text) transcript = text;
          } catch {
            // ignore
          }
          try {
            await SpeechRecognition.stop();
          } catch {
            try {
              await SpeechRecognition.forceStop();
            } catch {
              // ignore
            }
          }
          // Safety net if listeningState does not fire after stop
          window.setTimeout(() => {
            if (finished) return;
            const text = transcript.trim();
            if (text) {
              void finish({ ok: true, transcript: text });
              return;
            }
            if (intentionalCancel) {
              void finish({
                ok: false,
                failure: "user_cancelled",
                message: "",
              });
              return;
            }
            void finish({
              ok: false,
              failure: "no_speech",
              message: userMessageForSpeechFailure("no_speech"),
            });
          }, 500);
        })();
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();
    if (lower.includes("permission")) {
      await finish({
        ok: false,
        failure: "permission_denied",
        message: userMessageForSpeechFailure("permission_denied"),
      });
    } else if (lower.includes("not available") || lower.includes("unavailable")) {
      await finish({
        ok: false,
        failure: "unavailable",
        message: userMessageForSpeechFailure("unavailable"),
      });
    } else {
      await finish({
        ok: false,
        failure: "error",
        message: userMessageForSpeechFailure("error", message),
      });
    }
    return null;
  }
}
