-- Backfill deterministic Axiom DID values for Pi-authenticated users.
-- Keep the column nullable for non-Pi users, but make Pi users repairable and
-- ready for a future NOT NULL transition if every user type gets a DID.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "did" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "didMethod" TEXT DEFAULT 'did:axiom';

UPDATE "User"
SET "did" = 'did:axiom:axiomid.app:pi:' || "piUid"
WHERE "piUid" IS NOT NULL
  AND "did" IS NULL;

-- Prisma's nullable @unique maps to a unique index in PostgreSQL, which still
-- allows multiple NULL values. Create it after the Pi backfill so populated DID
-- values are constrained without forcing non-Pi users to have a DID yet.
CREATE UNIQUE INDEX IF NOT EXISTS "User_did_key" ON "User"("did");
