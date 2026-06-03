/** YouTube embed requires a cross-origin Referer; test/prod often block it without this policy. */
export const YOUTUBE_IFRAME_REFERRER_POLICY = "strict-origin-when-cross-origin";

export function toYouTubeEmbedUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "";

  let videoId: string | null = null;
  if (url.includes("youtube.com/watch?v=")) {
    try {
      videoId = new URL(url).searchParams.get("v");
    } catch {
      videoId = null;
    }
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0] ?? null;
  } else if (url.includes("youtube.com/embed/")) {
    videoId = url.split("youtube.com/embed/")[1]?.split("?")[0] ?? null;
  }

  if (!videoId) return url;

  const origin =
    typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
  const params = origin ? `?origin=${origin}` : "";
  return `https://www.youtube.com/embed/${videoId}${params}`;
}
