import { getProjects } from "../services/projects";
import ProjectsTable from "@/app/projects/projects-table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { projects, error } = await getProjects();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 lg:px-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Lista de proyectos
            </h1>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!error && projects.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No hay proyectos</EmptyTitle>
              <EmptyDescription>
                No se encontraron proyectos aún.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {!error && projects.length > 0 ? (
          <ProjectsTable projects={projects} />
        ) : null}
      </section>
    </main>
  );
}
