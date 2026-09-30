import ProjectEditView from "./project-edit-view";

export const dynamic = "force-dynamic";

export default async function ProjectEditPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  return <ProjectEditView id={id} />;
}
