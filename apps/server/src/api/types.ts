import type { OrgRole } from "@workspace/contracts";
import type { auth } from "../auth";

export type SessionUser = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session.session;

export interface AuthOrg {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
}

export type ApiEnv = {
  Variables: {
    user: SessionUser;
    session: Session;
    orgId: string;
    memberRole: OrgRole;
    org: AuthOrg;
  };
};
