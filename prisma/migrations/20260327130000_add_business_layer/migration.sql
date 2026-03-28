-- AddColumns: ExternalContact.contractStatus, ExternalContact.contractStartAt
ALTER TABLE "ExternalContact"
  ADD COLUMN "contractStatus"  TEXT,
  ADD COLUMN "contractStartAt" TIMESTAMPTZ(6);

-- CreateTable: Expense
CREATE TABLE "Expense" (
    "id"                  TEXT NOT NULL,
    "creatorProfileId"    BIGINT NOT NULL,
    "projectId"           BIGINT,
    "managerAssignmentId" TEXT,
    "category"            TEXT NOT NULL DEFAULT 'OTHER',
    "amountDecimal"       DECIMAL(18,2) NOT NULL,
    "currency"            TEXT NOT NULL DEFAULT 'JPY',
    "occurredAt"          TIMESTAMPTZ(6) NOT NULL,
    "title"               TEXT NOT NULL,
    "note"                TEXT,
    "receiptUrl"          TEXT,
    "createdAt"           TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updatedAt"           TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_creatorProfileId_occurredAt_idx" ON "Expense"("creatorProfileId", "occurredAt");
CREATE INDEX "Expense_projectId_occurredAt_idx" ON "Expense"("projectId", "occurredAt");
CREATE INDEX "Expense_managerAssignmentId_occurredAt_idx" ON "Expense"("managerAssignmentId", "occurredAt");
CREATE INDEX "Expense_category_occurredAt_idx" ON "Expense"("category", "occurredAt");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_managerAssignmentId_fkey"
  FOREIGN KEY ("managerAssignmentId") REFERENCES "ManagerAssignment"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
