import { buildYoutubeEmbedUrl, isYoutubeUrl } from "./youtube";

/** YouTube / Instagram / Facebook watch URLs → embeddable iframe src. */
export function buildVideoEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (isYoutubeUrl(trimmed)) {
    return buildYoutubeEmbedUrl(trimmed);
  }

  const instagram = trimmed.match(
    /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i,
  );
  if (instagram) {
    const kind = instagram[1].toLowerCase();
    const code = instagram[2];
    return `https://www.instagram.com/${kind}/${code}/embed`;
  }

  if (/facebook\.com|fb\.watch/i.test(trimmed)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=false`;
  }

  return null;
}

export function isDirectVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url.trim());
}
