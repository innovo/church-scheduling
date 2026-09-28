/**
 * Real giving via PayFast and/or Yoco (South Africa's two most common
 * gateways). Both are opt-in per church:
 *
 *  - PayFast: set PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, and (recommended)
 *    PAYFAST_PASSPHRASE as Vercel env vars. Set PAYFAST_SANDBOX=true while
 *    testing (uses sandbox.payfast.co.za with PayFast's public test
 *    credentials override disabled — you still use your own sandbox
 *    merchant details from https://sandbox.payfast.co.za).
 *  - Yoco: set YOCO_SECRET_KEY (Online Payments -> API Keys in the Yoco
 *    dashboard) and YOCO_WEBHOOK_SECRET (Developers -> Webhooks, after
 *    pointing a webhook at <your-site>/api/yoco-webhook).
 *
 * An admin also has to flip the "enabled" switch for each gateway on the
 * Admin > Payment settings screen — having the keys set is not enough on its
 * own, so a gateway can be fully configured but temporarily turned off.
 */
import { createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

const env = (key: string): string | undefined => {
  const v = process.env[key]?.trim();
  return v ? v : undefined;
};

export const PAYFAST_CONFIGURED = Boolean(env("PAYFAST_MERCHANT_ID") && env("PAYFAST_MERCHANT_KEY"));
export const YOCO_CONFIGURED = Boolean(env("YOCO_SECRET_KEY"));

async function metaGet(key: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from church_meta where key = ${key}`;
  return rows[0]?.value ?? null;
}

async function metaSet(key: string, value: string) {
  const sql = await getSql();
  await sql`
    insert into church_meta (key, value) values (${key}, ${value})
    on conflict (key) do update set value = excluded.value
  `;
}

export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const [payfastEnabled, yocoEnabled] = await Promise.all([
      metaGet("payments_payfast_enabled"),
      metaGet("payments_yoco_enabled"),
    ]);
    return {
      payfast: { configured: PAYFAST_CONFIGURED, enabled: payfastEnabled === "true" },
      yoco: { configured: YOCO_CONFIGURED, enabled: yocoEnabled === "true" },
    };
  });

export const setPaymentGatewayEnabled = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { gateway: "payfast" | "yoco"; enabled: boolean }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const [me] = await sql<{ is_admin: boolean; role: string }>`
      select is_admin, role from people where user_id = ${context.userId} limit 1
    `;
    if (!me?.is_admin && me?.role !== "pastor") throw new Error("Only pastors and admins can change payment settings");
    await metaSet(`payments_${data.gateway}_enabled`, data.enabled ? "true" : "false");
    return { ok: true as const };
  });

/** What the Give page should actually offer right now. */
export const getActiveGateways = createServerFn({ method: "GET" }).handler(async () => {
  const [payfastEnabled, yocoEnabled] = await Promise.all([
    metaGet("payments_payfast_enabled"),
    metaGet("payments_yoco_enabled"),
  ]);
  return {
    payfast: PAYFAST_CONFIGURED && payfastEnabled === "true",
    yoco: YOCO_CONFIGURED && yocoEnabled === "true",
  };
});

function randomRef(): string {
  return `gift_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function insertPendingContribution(params: {
  userId: string;
  amountCents: number;
  fund: string;
  gateway: "payfast" | "yoco";
  note?: string;
  anonymous?: boolean;
  recurring?: boolean;
}): Promise<string> {
  const sql = await getSql();
  const ref = randomRef();
  await sql`
    insert into contributions (user_id, amount_cents, fund, method, note, anonymous, recurring, status, gateway, payment_ref)
    values (
      ${params.userId}, ${params.amountCents}, ${params.fund}, ${params.gateway},
      ${params.note?.trim() || null}, ${Boolean(params.anonymous)}, ${Boolean(params.recurring)},
      'pending', ${params.gateway}, ${ref}
    )
  `;
  return ref;
}

// ── PayFast ──────────────────────────────────────────────────────────────

function payfastSignature(fields: [string, string][], passphrase?: string): string {
  const parts = fields
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`);
  if (passphrase) parts.push(`passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`);
  return createHash("md5").update(parts.join("&")).digest("hex");
}

export const startPayfastPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { amountCents: number; fund: string; note?: string; anonymous?: boolean; recurring?: boolean }) => d)
  .handler(async ({ context, data }) => {
    if (!PAYFAST_CONFIGURED) throw new Error("PayFast isn't configured yet");
    const merchantId = env("PAYFAST_MERCHANT_ID")!;
    const merchantKey = env("PAYFAST_MERCHANT_KEY")!;
    const passphrase = env("PAYFAST_PASSPHRASE");
    const sandbox = env("PAYFAST_SANDBOX") === "true";
    const siteUrl = env("BETTER_AUTH_URL") || "";
    if (!siteUrl) throw new Error("BETTER_AUTH_URL must be set for PayFast return/notify URLs to work");

    const amount = Math.round(data.amountCents) / 100;
    if (amount < 10) throw new Error("Minimum gift is R10");
    const ref = await insertPendingContribution({
      userId: context.userId,
      amountCents: Math.round(data.amountCents),
      fund: data.fund,
      gateway: "payfast",
      note: data.note,
      anonymous: data.anonymous,
      recurring: data.recurring,
    });

    const fields: [string, string][] = [
      ["merchant_id", merchantId],
      ["merchant_key", merchantKey],
      ["return_url", `${siteUrl}/give/thanks?ref=${ref}`],
      ["cancel_url", `${siteUrl}/give?cancelled=1`],
      ["notify_url", `${siteUrl}/api/payfast-notify`],
      ["m_payment_id", ref],
      ["amount", amount.toFixed(2)],
      ["item_name", `Giving: ${data.fund}`],
    ];
    const signature = payfastSignature(fields, passphrase);
    const action = sandbox ? "https://sandbox.payfast.co.za/eng/process" : "https://www.payfast.co.za/eng/process";
    return { action, fields: [...fields, ["signature", signature]] as [string, string][] };
  });

// ── Yoco ─────────────────────────────────────────────────────────────────

export const startYocoPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { amountCents: number; fund: string; note?: string; anonymous?: boolean; recurring?: boolean }) => d)
  .handler(async ({ context, data }) => {
    if (!YOCO_CONFIGURED) throw new Error("Yoco isn't configured yet");
    const secretKey = env("YOCO_SECRET_KEY")!;
    const siteUrl = env("BETTER_AUTH_URL") || "";
    if (!siteUrl) throw new Error("BETTER_AUTH_URL must be set for Yoco redirect URLs to work");

    const amountCents = Math.round(data.amountCents);
    if (amountCents < 1000) throw new Error("Minimum gift is R10");
    const ref = await insertPendingContribution({
      userId: context.userId,
      amountCents,
      fund: data.fund,
      gateway: "yoco",
      note: data.note,
      anonymous: data.anonymous,
      recurring: data.recurring,
    });

    const res = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountCents,
        currency: "ZAR",
        successUrl: `${siteUrl}/give/thanks?ref=${ref}`,
        cancelUrl: `${siteUrl}/give?cancelled=1`,
        failureUrl: `${siteUrl}/give?failed=1`,
        metadata: { paymentRef: ref },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Yoco checkout failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { redirectUrl?: string };
    if (!json.redirectUrl) throw new Error("Yoco did not return a checkout URL");
    return { url: json.redirectUrl };
  });

export const getGivingStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((ref: string) => ref)
  .handler(async ({ context, data: ref }) => {
    const sql = await getSql();
    const rows = await sql<{ status: string }>`
      select status from contributions where payment_ref = ${ref} and user_id = ${context.userId} limit 1
    `;
    return { status: rows[0]?.status ?? "unknown" };
  });
