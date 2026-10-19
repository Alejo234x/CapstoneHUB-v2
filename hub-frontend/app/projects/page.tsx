import ModuleHeader from "../components/module-header";
import ProjectsExplorer from "./projects-explorer";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  return (
    <main className="flex-1 text-foreground">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ModuleHeader
          eyebrow="Gestión de proyectos"
          title="Lista de proyectos"
        />

        <ProjectsExplorer />
      </section>
    </main>
  );
}
