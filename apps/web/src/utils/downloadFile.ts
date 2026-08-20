import { isNativePlatform } from "./capacitor";

export type DownloadBlobResult = "saved" | "cancelled";

/**
 * Save a file on web (anchor download) and on the phone app (share sheet).
 * Capacitor WebView ignores `<a download>`, so native uses Web Share with a File.
 */
export async function downloadBlobFile(
  blob: Blob,
  filename: string
): Promise<DownloadBlobResult> {
  const type = blob.type || "application/octet-stream";
  const file = new File([blob], filename, { type });

  if (isNativePlatform() || canShareFile(file)) {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ files: [file], title: filename });
        return "saved";
      }
    } catch (err) {
      if (isAbortError(err)) return "cancelled";
      // Fall through to the anchor download if share is unavailable.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return "saved";
}

function canShareFile(file: File): boolean {
  try {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
