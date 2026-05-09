import { z } from "zod";

const stripeSchema = z
  .object({
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_CLIENT_ID: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  })
  .refine(
    (v) => {
      const present = [v.STRIPE_SECRET_KEY, v.STRIPE_CLIENT_ID, v.STRIPE_WEBHOOK_SECRET].filter(Boolean).length;
      return present === 0 || present === 3;
    },
    { message: "STRIPE_* env vars must all be set together or all omitted" },
  );

const paymentSchema = z.object({
  PAYMENT_ENCRYPTION_KEY: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v) return true;
        try {
          return Buffer.from(v, "base64").length === 32;
        } catch {
          return false;
        }
      },
      { message: "PAYMENT_ENCRYPTION_KEY must be 32 bytes (base64)" },
    ),
});

const schema = z.intersection(stripeSchema, paymentSchema);

const parsed = schema.safeParse({
  STRIPE_SECRET_KEY: Bun.env.STRIPE_SECRET_KEY,
  STRIPE_CLIENT_ID: Bun.env.STRIPE_CLIENT_ID,
  STRIPE_WEBHOOK_SECRET: Bun.env.STRIPE_WEBHOOK_SECRET,
  PAYMENT_ENCRYPTION_KEY: Bun.env.PAYMENT_ENCRYPTION_KEY,
});

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("env validation failed:", parsed.error.format());
  throw new Error("invalid env config");
}

export const env = parsed.data;

export const stripeEnabled = Boolean(
  env.STRIPE_SECRET_KEY && env.STRIPE_CLIENT_ID && env.STRIPE_WEBHOOK_SECRET,
);

export function requireStripeEnv() {
  if (!stripeEnabled) {
    throw new Error("Stripe env vars required (STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, STRIPE_WEBHOOK_SECRET)");
  }
  return {
    secretKey: env.STRIPE_SECRET_KEY!,
    clientId: env.STRIPE_CLIENT_ID!,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET!,
  };
}
