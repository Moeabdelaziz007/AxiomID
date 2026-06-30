-- Migration: Add PiPayment.consumedByInstallationId
-- Prevents a single RELEASED payment from being reused to reinstall a paid
-- skill for free after an uninstall. The install gate now requires an
-- unconsumed payment and marks it consumed within the install transaction.

-- AlterTable
ALTER TABLE "PiPayment" ADD COLUMN "consumedByInstallationId" VARCHAR(36);
