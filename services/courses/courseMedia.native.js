import * as FileSystem from "expo-file-system/legacy";

import { getMeteorHttpOriginUrl } from "../appUrls";

export const getMeteorHttpOrigin = getMeteorHttpOriginUrl;

export const resolveCourseMediaUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${getMeteorHttpOrigin()}${String(path).startsWith("/") ? path : `/${path}`}`;
};

export const uploadCourseVideo = async ({ file, onProgress, path, token }) => {
  const task = FileSystem.createUploadTask(
    resolveCourseMediaUrl(path),
    file.uri,
    {
      headers: {
        "Content-Type": file.mimeType,
        "x-course-media-token": token,
        "x-file-name": file.fileName || "video",
      },
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    },
    ({ totalBytesExpectedToSend, totalBytesSent }) => {
      if (typeof onProgress !== "function" || totalBytesExpectedToSend <= 0) return;
      onProgress(Math.min(totalBytesSent / totalBytesExpectedToSend, 1));
    },
  );
  const response = await task.uploadAsync();

  if (!response || response.status < 200 || response.status >= 300) {
    let reason = "No se pudo subir el video";
    try {
      reason = JSON.parse(response?.body)?.error || reason;
    } catch {
      // La respuesta puede no ser JSON si un proxy interrumpe la carga.
    }
    throw new Error(reason);
  }

  return JSON.parse(response.body || "{}");
};