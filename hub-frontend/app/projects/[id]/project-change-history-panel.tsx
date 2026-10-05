import { ProjectChangeHistoryItem } from "../../services/schemas";
import { formatPhase, formatProjectSource } from "../../services/utils";
import { formatCurrency, formatDate } from "./project-formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  description: "Descripción",
  context: "Contexto",
  location: "Ubicación",
  source: "Fuente del proyecto",
  phase: "Fase (semestre)",
  startDate: "Fecha de inicio",
  endDate: "Fecha de finalización",
  estimatedCost: "Costo estimado",
  requiresLegalization: "Requiere legalización",
  isPrivate: "Proyecto privado",
  facultyAdvisor: "Asesor de la facultad",
  teamRequirements: "Equipo requerido",
  expectedOutcomes: "Expectativas al finalizar",
  deliverables: "Entregables",
};

function formatChangedAt(dateValue: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatFieldValue(field: string, value: string | null): string {
  if (value === null) {
    return "Sin información";
  }

  if (field === "requiresLegalization" || field === "isPrivate") {
    return value === "true" ? "Sí" : "No";
  }

  if (field === "source") {
    return formatProjectSource(value);
  }

  if (field === "phase") {
    return formatPhase(value);
  }

  if (field === "startDate" || field === "endDate") {
    return formatDate(value);
  }

  if (field === "estimatedCost") {
    return formatCurrency(value);
  }

  if (field === "deliverables") {
    try {
      const list = JSON.parse(value) as unknown;

      if (Array.isArray(list)) {
        return list.length > 0 ? list.join(", ") : "Sin entregables";
      }
    } catch {
      // Valor inesperado: se muestra tal cual.
    }
  }

  return value;
}

type ProjectChangeHistoryPanelProps = {
  readonly history: ProjectChangeHistoryItem[];
};

export default function ProjectChangeHistoryPanel({
  history,
}: ProjectChangeHistoryPanelProps) {
  const entries = history
    .slice()
    .sort(
      (left, right) =>
        new Date(right.changedAt).getTime() -
          new Date(left.changedAt).getTime() || right.id - left.id,
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de cambios del proyecto</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Sin historial</EmptyTitle>
              <EmptyDescription>
                No hay cambios en los datos del proyecto registrados.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="flex flex-col gap-4">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-2 pt-4">
                    <p className="text-sm font-medium">
                      {FIELD_LABELS[entry.field] ?? entry.field}
                    </p>

                    <p className="text-sm">
                      <span className="text-muted-foreground line-through">
                        {formatFieldValue(entry.field, entry.previousValue)}
                      </span>{" "}
                      <span className="text-muted-foreground">→</span>{" "}
                      <span className="text-foreground">
                        {formatFieldValue(entry.field, entry.newValue)}
                      </span>
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {entry.author
                        ? `Por ${entry.author.fullName}`
                        : "Por usuario desconocido"}{" "}
                      · {formatChangedAt(entry.changedAt)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
