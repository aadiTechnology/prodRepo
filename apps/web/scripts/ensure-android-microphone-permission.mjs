/**
 * Ensures AndroidManifest includes RECORD_AUDIO for voice chat.
 * Native recognition uses @capgo/capacitor-speech-recognition (plugin also
 * declares RECORD_AUDIO); this script keeps the app-level manifest resilient
 * after `npx cap add android` / regenerates.
 *
 * Official Capacitor target for permissions is:
 *   android/app/src/main/AndroidManifest.xml
 *
 * That folder is gitignored and regenerable via `npx cap add android`, so this
 * script is the source-controlled guarantee that runs after `cap sync`.
 * `npx cap sync` alone does not wipe existing uses-permission entries, but a
 * full regenerate does — re-running this (via npm run cap:sync) restores it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RECORD_AUDIO = "android.permission.RECORD_AUDIO";
const PERMISSION_LINE = `    <uses-permission android:name="${RECORD_AUDIO}" />`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml"
);

if (!fs.existsSync(manifestPath)) {
  console.warn(
    "[microphone-permission] AndroidManifest.xml not found — run after `npx cap add android`."
  );
  process.exit(0);
}

let xml = fs.readFileSync(manifestPath, "utf8");

if (xml.includes(RECORD_AUDIO)) {
  console.log("[microphone-permission] RECORD_AUDIO already declared.");
  process.exit(0);
}

if (xml.includes('android:name="android.permission.INTERNET"')) {
  xml = xml.replace(
    /(<uses-permission android:name="android\.permission\.INTERNET"\s*\/>)/,
    `$1\n${PERMISSION_LINE}`
  );
} else if (xml.includes("<!-- Permissions -->")) {
  xml = xml.replace(
    "<!-- Permissions -->",
    `<!-- Permissions -->\n\n${PERMISSION_LINE}`
  );
} else if (xml.includes("</manifest>")) {
  xml = xml.replace("</manifest>", `${PERMISSION_LINE}\n</manifest>`);
} else {
  console.error(
    "[microphone-permission] Could not find an insertion point in AndroidManifest.xml"
  );
  process.exit(1);
}

fs.writeFileSync(manifestPath, xml, "utf8");
console.log(
  "[microphone-permission] Added RECORD_AUDIO to android/app/src/main/AndroidManifest.xml"
);
