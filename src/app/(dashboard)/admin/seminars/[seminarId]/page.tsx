import { ContentDetailPage } from "../../courses/content-detail-page";

export default async function SeminarDetailPage({
  params,
}: {
  params: Promise<{ seminarId: string }>;
}) {
  const { seminarId } = await params;
  return <ContentDetailPage kind="seminar" id={seminarId} />;
}
