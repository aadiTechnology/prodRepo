import imageCompression from "browser-image-compression";

/** Original image may be up to 4 MB. Stored target is ~400 KB (not a guaranteed 10×). */
export const MAX_ORIGINAL_IMAGE_BYTES = 4 * 1024 * 1024;
export const TARGET_COMPRESSED_IMAGE_BYTES = 400 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/jfif", "image/webp", "image/gif"];

function isImageFile(file: File): boolean {
  if (file.type && IMAGE_TYPES.includes(file.type.toLowerCase())) return true;
  const name = file.name.toLowerCase();
  return [".jpg", ".jpeg", ".png", ".jfif", ".webp", ".gif"].some((ext) => name.endsWith(ext));
}

/**
 * Compress an image in the browser / Capacitor WebView before API upload.
 * PDFs and videos must not use this helper.
 */
export function isCompressableImage(file: File): boolean {
  return isImageFile(file);
}

/** Compress images; return PDFs and other documents unchanged. */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!isImageFile(file)) return file;
  return compressImage(file);
}

function isJpegFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".jpg") || name.endsWith(".jpeg");
}

export async function compressImage(file: File): Promise<File> {
  if (!isImageFile(file)) {
    throw new Error("Please select an image (JPG, PNG, or JFIF).");
  }
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new Error("Image size must not exceed 4 MB.");
  }
  if (file.size <= TARGET_COMPRESSED_IMAGE_BYTES && isJpegFile(file)) {
    return file;
  }

  const firstPass = await imageCompression(file, {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    initialQuality: 0.7,
    fileType: "image/jpeg",
  });

  let compressed = firstPass;
  if (compressed.size > TARGET_COMPRESSED_IMAGE_BYTES) {
    compressed = await imageCompression(file, {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      initialQuality: 0.5,
      fileType: "image/jpeg",
    });
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([compressed], `${baseName}.jpg`, { type: "image/jpeg" });
}
