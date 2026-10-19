import { ProjectDetails } from "../../services/schemas";
import { formatProjectSource } from "@/app/services/utils";
import { formatCurrency, formatDate } from "./project-formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

type ProjectGeneralTabProps = {
  readonly project: ProjectDetails;
};

/** Tarjeta de texto simple, para las secciones descriptivas del proyecto. */
function TextCard({
  title,
  children,
  preserveLineBreaks = false,
}: {
  readonly title: string;
  readonly children: string;
  readonly preserveLineBreaks?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={
            preserveLineBreaks
              ? "whitespace-pre-line text-muted-foreground"
              : "text-muted-foreground"
          }
        >
          {children}
        </p>
      </CardContent>
    </Card>
  );
}

function ProposerCard({ project }: { readonly project: ProjectDetails }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proponente</CardTitle>
      </CardHeader>
      <CardContent>
        {project.proposer ? (
          <p className="text-muted-foreground">
            <b> Nombre:</b> {project.proposer.fullName} <br />
            <b> Cédula:</b> {project.proposer.idNumber ?? "Sin información"} <br />
            <b> Correo:</b> {project.proposer.email ?? "Sin información"}
          </p>
        ) : (
          <p className="text-muted-foreground">
            Sin información del proponente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DeliverablesCard({
  deliverables,
}: {
  readonly deliverables: ProjectDetails["deliverables"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entregables</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 text-muted-foreground">
          {deliverables?.map((deliverable) => (
            <li key={deliverable.id}>{deliverable.description}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DatesAndCostCard({ project }: { readonly project: ProjectDetails }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fechas, ubicación y costos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          <b>Inicio:</b> {project.startDate ? formatDate(project.startDate) : "Sin información"} <br />
          <b>Fin:</b> {project.endDate ? formatDate(project.endDate) : "Sin información"} <br />
          <b>Ubicación:</b> {project.location ?? "Sin información"} <br />
          <b>Costo estimado:</b> {formatCurrency(project.estimatedCost) ?? "Sin información"}
        </p>
      </CardContent>
    </Card>
  );
}

export default function ProjectGeneralTab({
  project,
}: ProjectGeneralTabProps) {
  const hasDeliverables = Boolean(
    project.deliverables && project.deliverables.length > 0,
  );
  const hasDatesAndCost = Boolean(
    project.startDate ||
      project.endDate ||
      project.location ||
      project.estimatedCost,
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-right text-xs text-muted-foreground">
        Creado el {formatDate(project.createdAt)}
      </p>

      <ProposerCard project={project} />

      <TextCard title="Descripción" preserveLineBreaks>
        {project.description}
      </TextCard>

      <TextCard title="Contexto" preserveLineBreaks>
        {project.context}
      </TextCard>

      <TextCard title="Fuente del proyecto">
        {project.source
          ? formatProjectSource(project.source)
          : "Sin información"}
      </TextCard>

      {project.facultyAdvisor ? (
        <TextCard title="Asesor de la facultad">
          {project.facultyAdvisor}
        </TextCard>
      ) : null}

      {project.teamRequirements ? (
        <TextCard title="Equipo requerido" preserveLineBreaks>
          {project.teamRequirements}
        </TextCard>
      ) : null}

      {hasDeliverables ? (
        <DeliverablesCard deliverables={project.deliverables} />
      ) : null}

      {project.expectedOutcomes ? (
        <TextCard title="Expectativas al finalizar" preserveLineBreaks>
          {project.expectedOutcomes}
        </TextCard>
      ) : null}

      <TextCard title="Proceso de legalización">
        {project.requiresLegalization
          ? "El proyecto requiere proceso de legalización (contrato de confidencialidad, convenio u otros trámites con el proponente)."
          : "El proyecto no requiere proceso de legalización."}
      </TextCard>

      {hasDatesAndCost ? <DatesAndCostCard project={project} /> : null}
    </div>
  );
}
