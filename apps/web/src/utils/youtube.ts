const YOUTUBE_ID_PATTERNS = [
  /youtu\.be\/([\w-]{11})/i,
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/i,
  /youtube\.com\/embed\/([\w-]{11})/i,
  /youtube\.com\/shorts\/([\w-]{11})/i,
];

export function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function isYoutubeUrl(url: string): boolean {
  return extractYoutubeVideoId(url) !== null;
}

export function buildYoutubeEmbedUrl(urlOrId: string): string {
  const videoId = extractYoutubeVideoId(urlOrId) ?? urlOrId;
  return `https://www.youtube.com/embed/${videoId}`;
}

export function buildYoutubeWatchUrl(urlOrId: string): string {
  const videoId = extractYoutubeVideoId(urlOrId) ?? urlOrId;
  return `https://www.youtube.com/watch?v=${videoId}`;
}
