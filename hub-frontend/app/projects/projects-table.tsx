"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTable,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useState } from "react";
import { columns } from "./columns";
import {
  features,
  type ProjectTableFeatures,
} from "./projects-table-features";
import { ProjectItem } from "../services/schemas";

type ProjectsTableProps = {
  projects: ProjectItem[];
};

const statusOptions = [
  { value: "all", label: "Todos los estados" },
  { value: "Propuesto", label: "Propuesto" },
  { value: "En revisión", label: "En revisión" },
  { value: "Aprobado", label: "Aprobado" },
  { value: "Asignado", label: "Asignado" },
  { value: "En progreso", label: "En progreso" },
  { value: "Cerrado", label: "Cerrado" },
  { value: "Rechazado", label: "Rechazado" },
];

export default function ProjectsTable({ projects }: ProjectsTableProps) {
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>([]);

  const table = useTable<ProjectTableFeatures, ProjectItem>({
    features,
    data: projects,
    columns,
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
  });

  const nameColumn = table.getColumn("name");
  const locationColumn = table.getColumn("location");
  const proposerColumn = table.getColumn("proposer");
  const statusColumn = table.getColumn("status");
  const yearColumn = table.getColumn("year");

  const nameFilterValue =
    (nameColumn?.getFilterValue() as string) ?? "";

  const locationFilterValue =
    (locationColumn?.getFilterValue() as string) ?? "";

  const proposerFilterValue =
    (proposerColumn?.getFilterValue() as string) ?? "";

  const statusFilterValue =
    (statusColumn?.getFilterValue() as string) ?? "all";

  const yearFilterValue =
    (yearColumn?.getFilterValue() as string) ?? "";

  function setFilterAndResetPage(
    column: typeof nameColumn,
    value: string | null | undefined,
  ) {
    column?.setFilterValue(value ?? undefined);
    table.setPageIndex(0);
  }

  function clearFilters() {
    table.resetColumnFilters();
    table.setPageIndex(0);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 py-4">
        <Input
          type="search"
          placeholder="Filtrar por nombre..."
          value={nameFilterValue}
          onChange={(event) =>
            setFilterAndResetPage(
              nameColumn,
              event.target.value,
            )
          }
          className="w-full sm:max-w-sm"
        />

        <Input
          type="search"
          placeholder="Filtrar por lugar..."
          value={locationFilterValue}
          onChange={(event) =>
            setFilterAndResetPage(
              locationColumn,
              event.target.value,
            )
          }
          className="w-full sm:max-w-sm"
        />

        <Input
          type="search"
          placeholder="Filtrar por proponente..."
          value={proposerFilterValue}
          onChange={(event) =>
            setFilterAndResetPage(
              proposerColumn,
              event.target.value,
            )
          }
          className="w-full sm:max-w-sm"
        />

        <Select
          value={statusFilterValue}
          onValueChange={(value) =>
            setFilterAndResetPage(
              statusColumn,
              value === "all" ? undefined : value,
            )
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>

          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem
                key={status.value}
                value={status.value}
              >
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Año..."
          value={yearFilterValue}
          onChange={(event) =>
            setFilterAndResetPage(
              yearColumn,
              event.target.value,
            )
          }
          className="w-full sm:w-28"
        />

        {columnFilters.length > 0 && (
          <Button
            variant="outline"
            onClick={clearFilters}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={
                    row.getIsSelected() && "selected"
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  No se encontraron proyectos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
