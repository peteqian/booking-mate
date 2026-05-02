ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_user_id_user_id_fk";
ALTER TABLE "session"
  ADD CONSTRAINT "session_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_user_id_user_id_fk";
ALTER TABLE "account"
  ADD CONSTRAINT "account_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

ALTER TABLE "member" DROP CONSTRAINT IF EXISTS "member_organization_id_organization_id_fk";
ALTER TABLE "member"
  ADD CONSTRAINT "member_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;

ALTER TABLE "member" DROP CONSTRAINT IF EXISTS "member_user_id_user_id_fk";
ALTER TABLE "member"
  ADD CONSTRAINT "member_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;

ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_organization_id_organization_id_fk";
ALTER TABLE "invitation"
  ADD CONSTRAINT "invitation_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;

ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_inviter_id_user_id_fk";
ALTER TABLE "invitation"
  ADD CONSTRAINT "invitation_inviter_id_user_id_fk"
  FOREIGN KEY ("inviter_id") REFERENCES "user"("id") ON DELETE CASCADE;
