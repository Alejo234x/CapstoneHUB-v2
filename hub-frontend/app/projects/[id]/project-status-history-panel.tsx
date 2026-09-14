import { ProjectStatusHistoryItem } from "../../services/schemas";
import { formatStatus } from "../../services/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

type ProjectStatusHistoryPanelProps = {
  history: ProjectStatusHistoryItem[];
};

function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export default function ProjectStatusHistoryPanel({
  history,
}: ProjectStatusHistoryPanelProps) {
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
        <CardTitle>Historial de cambios de estado</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Sin historial</EmptyTitle>
              <EmptyDescription>
                No hay cambios de estado registrados.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="flex flex-col gap-4">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Card size="sm">
                  <CardContent className="flex flex-col gap-3 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.previousStatus ? (
                        <>
                          <Badge variant="outline">
                            {formatStatus(entry.previousStatus)}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                        </>
                      ) : (
                        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Estado inicial
                        </span>
                      )}
                      <Badge variant="secondary">
                        {formatStatus(entry.nextStatus)}
                      </Badge>
                    </div>

                    <p className="whitespace-pre-wrap text-sm">
                      {entry.description ?? "Sin descripción."}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {entry.author
                        ? `Por ${entry.author.fullName}`
                        : "Por usuario desconocido"}{" "}
                      · {formatDate(entry.changedAt)}
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
