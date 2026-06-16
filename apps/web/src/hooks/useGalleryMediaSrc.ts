import { useEffect, useState } from "react";
import activityGalleryService from "../api/services/activityGalleryService";
import { apiBaseUrl } from "../config";

export function useGalleryMediaSrc(filePath: string | undefined): string | undefined {
  const [src, setSrc] = useState<string | undefined>();

  useEffect(() => {
    if (!filePath) {
      setSrc(undefined);
      return;
    }
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      setSrc(filePath);
      return;
    }
    if (filePath.includes("/media/") && filePath.endsWith("/content")) {
      let objectUrl: string | undefined;
      let cancelled = false;
      activityGalleryService
        .fetchMediaContent(filePath)
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        })
        .catch(() => {
          if (!cancelled) setSrc(undefined);
        });
      return () => {
        cancelled = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }
    setSrc(`${apiBaseUrl}${filePath}`);
  }, [filePath]);

  return src;
}
