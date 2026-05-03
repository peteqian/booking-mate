import { Hono } from "hono";
import { apiError } from "./errors";
import type { ApiEnv } from "./types";
import { requireAuth, requireOrg, requireRole } from "../middleware/auth";
import {
  deletePaymentConnection,
  listPaymentConnections,
  listPaymentProviders,
} from "../services/payments";

export const paymentRoutes = new Hono<ApiEnv>();

paymentRoutes.post("/webhooks/:provider", (c) =>
  c.json({ provider: c.req.param("provider"), received: true }),
);

paymentRoutes
  .use("*", requireAuth, requireOrg)
  .get("/providers", (c) => c.json(listPaymentProviders()))
  .get("/connections", async (c) =>
    c.json({ connections: await listPaymentConnections(c.var.orgId) }),
  )
  .post("/connect", requireRole("admin"), (c) =>
    c.json({ orgId: c.var.orgId, connected: false }, 501),
  )
  .get("/callback/:provider", requireRole("admin"), (c) =>
    c.json({ provider: c.req.param("provider"), completed: false }, 501),
  )
  .delete("/connections/:connectionId", requireRole("admin"), async (c) => {
    const deleted = await deletePaymentConnection(c.var.orgId, c.req.param("connectionId"));
    if (!deleted)
      return apiError(c, 404, "payment_connection_not_found", "Payment connection not found");
    return c.json({ deleted: true });
  });
