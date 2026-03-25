import { ManagerDeskCreatorDetailPreviewClient } from "@/components/managerDesk/ManagerDeskCreatorDetailPreviewClient";

type Params = {
  creatorProfileId: string;
};

export default async function ManagerDeskCreatorDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { creatorProfileId } = await params;
  return (
    <ManagerDeskCreatorDetailPreviewClient creatorProfileId={creatorProfileId} />
  );
}
