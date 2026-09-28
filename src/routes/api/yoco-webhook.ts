/**
 * Yoco webhook (Developers -> Webhooks -> point at <your-site>/api/yoco-webhook
 * for the `payment.succeeded` and `payment.failed` events). Yoco signs each
 * delivery the same way Svix does: `webhook-signature` is
 * `v1,<base64 HMAC-SHA256 of "{id}.{timestamp}.{raw body}" using YOCO_WEBHOOK_SECRET>`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

function verify(rawBody: string, id: string, timestamp: string, signatureHeader: string, secret: string): boolean {
  // YOCO_WEBHOOK_SECRET as shown in the dashboard is prefixed "whsec_" — the
  // signing key itself is the base64 payload after that prefix.
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  return signatureHeader
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean)
    .some((sig) => {
      try {
        return timingSafeEqual(Buffer.from(sig!), Buffer.from(expected));
      } catch {
        return false;
      }
    });
}

export const Route = createFileRoute("/api/yoco-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const secret = process.env.YOCO_WEBHOOK_SECRET?.trim();
          const raw = await request.text();
          if (secret) {
            const id = request.headers.get("webhook-id") ?? "";
            const timestamp = request.headers.get("webhook-timestamp") ?? "";
            const signature = request.headers.get("webhook-signature") ?? "";
            if (!verify(raw, id, timestamp, signature, secret)) {
              console.error("[yoco] signature mismatch");
              return new Response("bad signature", { status: 400 });
            }
          } else {
            console.warn("[yoco] YOCO_WEBHOOK_SECRET not set — accepting webhook unverified");
          }

          const event = JSON.parse(raw) as {
            type?: string;
            payload?: { metadata?: { paymentRef?: string } };
          };
          const ref = event.payload?.metadata?.paymentRef;
          if (!ref) return new Response("ok", { status: 200 });

          const status = event.type === "payment.succeeded" ? "paid" : event.type === "payment.failed" ? "failed" : null;
          if (status) {
            const sql = await getSql();
            await sql`update contributions set status = ${status} where payment_ref = ${ref}`;
          }
          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[yoco] webhook handler error", err);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
