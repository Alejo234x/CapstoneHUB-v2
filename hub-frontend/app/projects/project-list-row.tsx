import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { type ProjectItem } from "../services/schemas";
import { formatProjectSource, formatStatus } from "../services/utils";
import { type ProjectDensity, getProjectYear } from "./project-list-config";

type ProjectListRowProps = {
  readonly project: ProjectItem;
  readonly density: ProjectDensity;
};

/** Fila de la lista de proyectos, con dos niveles de detalle. */
export default function ProjectListRow({
  project,
  density,
}: ProjectListRowProps) {
  const year = getProjectYear(project);

  if (density === "compact") {
    return (
      <li>
        <Link
          href={`/projects/${project.id}`}
          className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-utb-blue/[0.04] focus-visible:bg-utb-blue/[0.04] focus-visible:outline-none"
        >
          <span className="w-20 shrink-0 truncate text-[11px] font-medium text-muted-foreground">
            {formatStatus(project.status)}
          </span>

          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover:text-utb-blue">
            {project.name}
          </span>

          <span className="shrink-0 text-xs text-muted-foreground">
            {year ?? "—"}
          </span>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={`/projects/${project.id}`}
        className="group flex flex-col gap-2.5 px-4 py-4 transition-colors hover:bg-utb-blue/[0.04] focus-visible:bg-utb-blue/[0.04] focus-visible:outline-none sm:px-5"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-utb-blue">
            {project.name}
          </span>

          <span className="shrink-0 text-xs text-muted-foreground">
            {year ?? "—"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{formatStatus(project.status)}</Badge>

          {project.source ? (
            <Badge variant="outline">
              {formatProjectSource(project.source)}
            </Badge>
          ) : null}

          {project.requiresLegalization ? (
            <Badge variant="outline">Con legalización</Badge>
          ) : null}

          {project.isPrivate ? (
            <Badge variant="outline">Privado</Badge>
          ) : null}
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{project.proposer?.fullName ?? "Sin proponente"}</span>

          {project.location ? <span>{project.location}</span> : null}
        </p>
      </Link>
    </li>
  );
}
