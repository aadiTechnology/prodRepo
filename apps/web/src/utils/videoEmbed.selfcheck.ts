import { buildVideoEmbedUrl, isDirectVideoFileUrl } from "./videoEmbed";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(
  buildVideoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ") ===
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  "youtube watch → embed",
);
assert(
  buildVideoEmbedUrl("https://www.instagram.com/reel/AbC123xyZ/") ===
    "https://www.instagram.com/reel/AbC123xyZ/embed",
  "instagram reel → embed",
);
assert(
  buildVideoEmbedUrl("https://www.facebook.com/watch/?v=123")?.includes(
    "facebook.com/plugins/video.php",
  ) === true,
  "facebook → plugin embed",
);
assert(isDirectVideoFileUrl("https://cdn.example.com/a.mp4"), "mp4 is direct");
assert(!isDirectVideoFileUrl("https://www.instagram.com/p/x/"), "instagram is not direct");

console.log("videoEmbed self-check ok");
