import { createAccessControl } from "better-auth/plugins/access";

export const statement = {
  organization: ["create", "update", "delete", "invite", "remove", "transfer"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  organization: ["create", "update", "delete", "invite", "remove", "transfer"],
});

export const admin = ac.newRole({
  organization: ["update", "invite"],
});
