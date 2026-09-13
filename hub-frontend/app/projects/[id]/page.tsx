import { notFound } from "next/navigation";
import { getProjectById } from "../../services/projects";
import ProjectStatusEditForm from "../../components/project-status-edit-form";
import ProjectObservationsPanel from "./project-observations-panel";
import ProjectActorAssignmentPanel from "./project-actor-assignment-panel";
import ProjectCategoriesPanel from "./project-categories-panel";
import ProjectMilestonesPanel from "./project-milestones-panel";
import ProjectAssignmentBadge from "./project-assignment-badge";
import { formatStatus } from "@/app/services/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function formatDate(dateValue: string | null): string {
  if (!dateValue) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatCurrency(value: string | null): string {
  if (!value) {
    return "No definido";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { project, error } = await getProjectById(id);

  if (!project || error) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-100 text-slate-900">
      <section className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-10 lg:px-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Proyecto #{project.id}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {project.name}
            </h1>
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{formatStatus(project.status)}</Badge>
            <ProjectAssignmentBadge
              assignments={project.actorAssignments ?? []}
            />
            <span className="text-sm text-muted-foreground">
              Creado el {formatDate(project.createdAt)}
            </span>
          </div>

          <Tabs defaultValue="general" className="mt-6 w-full">
            <TabsList className="w-full sm:w-fit">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="categorias">Categorías</TabsTrigger>
              <TabsTrigger value="fechas">Fechas y costos</TabsTrigger>
              <TabsTrigger value="equipo">Equipo</TabsTrigger>
              <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
              <TabsTrigger value="hitos">Hitos</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6 flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Proponente</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.proposer ? (
                    <Table>
                      <TableBody>
                        {project.proposer.type === "natural_person" ? (
                          <>
                            <TableRow>
                              <TableCell className="text-muted-foreground">
                                Nombre completo
                              </TableCell>
                              <TableCell className="text-right">
                                {project.proposer.fullName}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-muted-foreground">
                                Cédula
                              </TableCell>
                              <TableCell className="text-right">
                                {project.proposer.idNumber}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-muted-foreground">
                                Correo
                              </TableCell>
                              <TableCell className="text-right">
                                {project.proposer.email}
                              </TableCell>
                            </TableRow>
                          </>
                        ) : (
                          <>
                            <TableRow>
                              <TableCell className="text-muted-foreground">
                                Razón social
                              </TableCell>
                              <TableCell className="text-right">
                                {project.proposer.legalName}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-muted-foreground">
                                NIT
                              </TableCell>
                              <TableCell className="text-right">
                                {project.proposer.nit}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-muted-foreground">
                                Correo
                              </TableCell>
                              <TableCell className="text-right">
                                {project.proposer.email}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-muted-foreground">
                                Teléfono
                              </TableCell>
                              <TableCell className="text-right">
                                {project.proposer.phone}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-muted-foreground">
                                Contacto
                              </TableCell>
                              <TableCell className="text-right">
                                {project.proposer.contactUrl ?? "Sin enlace"}
                              </TableCell>
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">
                      Sin información del proponente.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Descripción</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {project.description}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contexto</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {project.context}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lugar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {project.location || "Sin información"}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categorias" className="mt-6">
              <ProjectCategoriesPanel categories={project.categories} />
            </TabsContent>

            <TabsContent value="fechas" className="mt-6 space-y-6">
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Fechas
                </h2>
                <dl className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500">Inicio</dt>
                    <dd className="text-right">
                      {formatDate(project.startDate)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500">Costo estimado</dt>
                    <dd className="text-right">
                      {formatCurrency(project.estimatedCost)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Trazabilidad
                </h2>
                <dl className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500">Actualizado</dt>
                    <dd className="text-right">
                      {formatDate(project.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </section>
            </TabsContent>

            <TabsContent value="equipo" className="mt-6">
              <ProjectActorAssignmentPanel
                projectId={project.id}
                assignments={project.actorAssignments ?? []}
              />
            </TabsContent>

            <TabsContent value="observaciones" className="mt-6">
              <ProjectObservationsPanel
                projectId={project.id}
                observations={project.observations ?? []}
              />
            </TabsContent>

            <TabsContent value="hitos" className="mt-6">
              <ProjectMilestonesPanel
                projectId={project.id}
                milestones={project.milestones ?? []}
                actorAssignments={project.actorAssignments ?? []}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 flex w-full justify-end">
          <ProjectStatusEditForm
            projectId={project.id}
            currentStatus={project.status}
          />
        </div>
      </section>
    </main>
  );
}
