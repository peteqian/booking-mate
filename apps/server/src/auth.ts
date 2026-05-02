import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { member } from "./db/schema";
import { ac, owner, admin } from "./auth/permissions";
import { sendInviteEmail } from "./auth/email";

const polarClient = process.env.POLAR_ACCESS_TOKEN
  ? new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      server: (process.env.POLAR_ENVIRONMENT as "sandbox" | "production") ?? "sandbox",
    })
  : null;

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

const organizationPlugin = organization({
    organizationLimit: 1,
    ac,
    roles: { owner, admin },
    organizationHooks: {
      beforeAddMember: async ({ member: memberData, user }) => {
        const existing = await db
          .select()
          .from(member)
          .where(eq(member.userId, user.id));
        if (existing.length > 0) {
          throw new Error("User already belongs to an organization");
        }
        return { data: memberData };
      },
      beforeAcceptInvitation: async ({ user }) => {
        const existing = await db
          .select()
          .from(member)
          .where(eq(member.userId, user.id));
        if (existing.length > 0) {
          throw new Error("Already in an organization");
        }
      },
    },
    membershipLimit: async () => {
      // Owner is free. Polar will become the source of truth for paid admin seats.
      // Until products are configured, keep the org at owner + one invited admin.
      return 2;
    },
    sendInvitationEmail: async (data) => {
      const webUrl = process.env.WEB_URL || "http://localhost:5678";
      const inviteLink = `${webUrl}/invite/${data.id}`;
      await sendInviteEmail({
        email: data.email,
        organizationName: data.organization.name,
        inviteLink,
      });
    },
  });

const polarPlugin = polarClient
  ? polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [],
          successUrl: "/settings/billing?success",
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET || "",
          onSubscriptionActive: async () => {
            // Polar remains source of truth; no local seat cache yet.
          },
          onSubscriptionCanceled: async () => {
            // Polar remains source of truth; no local seat cache yet.
          },
        }),
      ],
    })
  : null;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.WEB_URL || "http://localhost:5678"],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: googleProvider,
  plugins: polarPlugin ? [organizationPlugin, polarPlugin] : [organizationPlugin],
});
