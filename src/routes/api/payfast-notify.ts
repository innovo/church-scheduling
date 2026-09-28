/**
 * PayFast ITN (Instant Transaction Notification) webhook. PayFast POSTs here
 * (form-urlencoded) after a payment completes. We verify the signature, then
 * mark the matching contribution paid/failed by its `m_payment_id` (our
 * `payment_ref`).
 *
 * Hardening PayFast recommends beyond this (left as a follow-up since they
 * need real sandbox testing to get right): confirming the source IP is one
 * of PayFast's, and posting the payload back to PayFast's `/validate`
 * endpoint before trusting it.
 */
import { createHash } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/payfast-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          const params = new URLSearchParams(raw);
          const postedSignature = params.get("signature");
          if (!postedSignature) return new Response("missing signature", { status: 400 });

          const passphrase = process.env.PAYFAST_PASSPHRASE?.trim();
          const withoutSig = raw
            .split("&")
            .filter((pair) => !pair.startsWith("signature="))
            .join("&");
          const toHash = passphrase
            ? `${withoutSig}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`
            : withoutSig;
          const expected = createHash("md5").update(toHash).digest("hex");
          if (expected !== postedSignature) {
            console.error("[payfast] signature mismatch");
            return new Response("bad signature", { status: 400 });
          }

          const ref = params.get("m_payment_id");
          const status = params.get("payment_status");
          if (!ref) return new Response("missing m_payment_id", { status: 400 });

          const sql = await getSql();
          await sql`
            update contributions
            set status = ${status === "COMPLETE" ? "paid" : "failed"}
            where payment_ref = ${ref}
          `;
          return new Response("ok", { status: 200 });
        } catch (err) {
          console.error("[payfast] notify handler error", err);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
