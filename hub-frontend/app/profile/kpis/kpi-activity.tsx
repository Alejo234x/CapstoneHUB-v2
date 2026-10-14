"use client";

import { useState } from "react";
import { KpiResponse, KpiReviewWindow } from "../../services/stats";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReviewPeriod = "all" | "last30Days" | "lastWeek";

const PERIODS: { value: ReviewPeriod; label: string }[] = [
  { value: "all", label: "Todo el tiempo" },
  { value: "last30Days", label: "Últimos 30 días" },
  { value: "lastWeek", label: "Última semana" },
];

function formatAverage(hours: number | null): string {
  if (hours === null) {
    return "—";
  }

  if (hours < 24) {
    return `${hours.toLocaleString("es-CO", { maximumFractionDigits: 1 })} h`;
  }

  return `${(hours / 24).toLocaleString("es-CO", {
    maximumFractionDigits: 1,
  })} días`;
}

function Metric({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/40 p-4 ring-1 ring-utb-blue/10">
      <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default function KpiActivity({
  myReviews,
}: {
  readonly myReviews: KpiResponse["myReviews"];
}) {
  const [period, setPeriod] = useState<ReviewPeriod>("all");
  const window: KpiReviewWindow = myReviews[period];
  const acceptance =
    window.total > 0
      ? `${Math.round((window.accepted / window.total) * 100)}%`
      : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi actividad</CardTitle>
        <CardDescription>
          Entregas que revisaste en el período seleccionado.
        </CardDescription>

        <CardAction>
          <Select
            value={period}
            onValueChange={(value) => {
              if (value) {
                setPeriod(value as ReviewPeriod);
              }
            }}
          >
            <SelectTrigger className="w-[180px]" aria-label="Período">
              <SelectValue>
                {PERIODS.find((option) => option.value === period)?.label ??
                  "Período"}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {PERIODS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent>
        {window.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            No registras revisiones de entregas en este período.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Revisadas" value={String(window.total)} />
            <Metric
              label="Aceptadas"
              value={String(window.accepted)}
              hint={`Tasa de aceptación: ${acceptance}`}
            />
            <Metric label="No aceptadas" value={String(window.rejected)} />
            <Metric
              label="Tiempo medio de revisión"
              value={formatAverage(window.averageHours)}
              hint="Desde el envío hasta tu decisión."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
