import { ContentDetailPage } from "../content-detail-page";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <ContentDetailPage kind="course" id={courseId} />;
}
