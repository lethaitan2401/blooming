-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'BANK_TRANSFER';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "reportedAt" TIMESTAMP(3);
