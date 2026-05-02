ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_user_id_fkey";
ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_user_id_fkey";
ALTER TABLE "member" DROP CONSTRAINT IF EXISTS "member_organization_id_fkey";
ALTER TABLE "member" DROP CONSTRAINT IF EXISTS "member_user_id_fkey";
ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_organization_id_fkey";
ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_inviter_id_fkey";
