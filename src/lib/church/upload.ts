/**
 * Shared image upload (profile photos, event invitation images) via Vercel
 * Blob. Requires a Blob store connected to the Vercel project (Storage tab ->
 * Create Database -> Blob -> Connect Project), which injects
 * `BLOB_READ_WRITE_TOKEN` automatically. Without it, uploads fail with a clear
 * error rather than a cryptic SDK exception.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";

const MAX_BYTES: Record<"avatar" | "event" | "logo", number> = {
  avatar: 4 * 1024 * 1024,
  event: 8 * 1024 * 1024,
  logo: 4 * 1024 * 1024,
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const uploadImage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { dataUrl: string; kind: "avatar" | "event" | "logo" }) => d)
  .handler(async ({ context, data }) => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "Image uploads aren't set up yet. Connect a Blob store to this project in Vercel (Storage -> Create Database -> Blob) and redeploy.",
      );
    }
    const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Invalid image data");
    const contentType = match[1]!;
    const b64 = match[2]!;
    if (!ALLOWED_TYPES.has(contentType)) {
      throw new Error("Only JPG, PNG, WEBP, or GIF images are allowed");
    }
    const buffer = Buffer.from(b64, "base64");
    const limit = MAX_BYTES[data.kind] ?? MAX_BYTES.avatar;
    if (buffer.byteLength > limit) {
      throw new Error(`Image is too large, max ${Math.round(limit / 1024 / 1024)}MB`);
    }
    const { put } = await import("@vercel/blob");
    const ext = contentType.split("/")[1] || "jpg";
    const filename = `${data.kind}/${context.userId}-${Date.now()}.${ext}`;
    const blob = await put(filename, buffer, { access: "public", contentType });
    return { url: blob.url };
  });

const MAX_AUDIO_BYTES = 60 * 1024 * 1024;

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
]);

export const uploadAudio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { dataUrl: string }) => d)
  .handler(async ({ context, data }) => {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        "Audio uploads aren't set up yet. Connect a Blob store to this project in Vercel (Storage -> Create Database -> Blob) and redeploy.",
      );
    }
    const match = /^data:([\w/+.-]+);base64,(.+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Invalid audio data");
    const contentType = match[1]!;
    const b64 = match[2]!;
    if (!ALLOWED_AUDIO_TYPES.has(contentType)) {
      throw new Error("Only MP3, WAV, M4A, AAC, or OGG audio files are allowed");
    }
    const buffer = Buffer.from(b64, "base64");
    if (buffer.byteLength > MAX_AUDIO_BYTES) {
      throw new Error(`Audio is too large, max ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)}MB`);
    }
    const { put } = await import("@vercel/blob");
    const ext = contentType.split("/")[1]?.replace("x-", "") || "mp3";
    const filename = `sermon-audio/${context.userId}-${Date.now()}.${ext}`;
    const blob = await put(filename, buffer, { access: "public", contentType });
    return { url: blob.url };
  });
