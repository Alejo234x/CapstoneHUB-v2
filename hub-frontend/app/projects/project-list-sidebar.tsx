"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "../components/auth-provider";
import { type ProjectListFilters } from "./project-list-config";

type ProjectListSidebarProps = {
  readonly filters: ProjectListFilters;
  readonly onFiltersChange: (filters: ProjectListFilters) => void;
  readonly className?: string;
};

function FilterCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />

      <label
        htmlFor={id}
        className="cursor-pointer text-sm text-foreground"
      >
        {label}
      </label>
    </div>
  );
}

/** Filtros rápidos del listado de proyectos. Solo se usa en /projects. */
export default function ProjectListSidebar({
  filters,
  onFiltersChange,
  className,
}: ProjectListSidebarProps) {
  const { session } = useAuth();

  const activeCount = [
    filters.assignedToMe,
    filters.proposedByMe,
    filters.hasTeam,
    filters.privateOnly,
    filters.legalization.includes("si"),
  ].filter(Boolean).length;

  function updateFilters(partial: Partial<ProjectListFilters>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <aside
      className={cn(
        "lg:sticky lg:top-20 lg:w-72 lg:shrink-0",
        className
      )}
      aria-label="Filtros rápidos de proyectos"
    >
      <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-utb-blue/10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Filtros rápidos
          </h2>

          {activeCount > 0 ? (
            <Badge variant="secondary">{activeCount}</Badge>
          ) : null}
        </div>

        {session ? (
          <div className="mt-4">
            <p className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
              Mi participación
            </p>

            <div className="mt-2.5 flex flex-col gap-2.5">
              <FilterCheckbox
                id="sidebar-assigned-to-me"
                label="Asignados a mí"
                checked={filters.assignedToMe}
                onChange={(assignedToMe) =>
                  updateFilters({ assignedToMe })
                }
              />

              <FilterCheckbox
                id="sidebar-proposed-by-me"
                label="Propuestos por mí"
                checked={filters.proposedByMe}
                onChange={(proposedByMe) =>
                  updateFilters({ proposedByMe })
                }
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Inicia sesión para filtrar por tu participación.
          </p>
        )}

        <Separator className="my-4" />

        <p className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
          Equipo
        </p>

        <div className="mt-2.5">
          <FilterCheckbox
            id="sidebar-has-team"
            label="Con equipo asignado"
            checked={filters.hasTeam}
            onChange={(hasTeam) => updateFilters({ hasTeam })}
          />
        </div>

        <Separator className="my-4" />

        <p className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
          Proyecto
        </p>

        <div className="mt-2.5 flex flex-col gap-2.5">
          <FilterCheckbox
            id="sidebar-requires-legalization"
            label="Requiere legalización"
            checked={filters.legalization.includes("si")}
            onChange={(checked) =>
              updateFilters({
                legalization: checked ? ["si"] : [],
              })
            }
          />

          <FilterCheckbox
            id="sidebar-private-only"
            label="Solo privados"
            checked={filters.privateOnly}
            onChange={(privateOnly) =>
              updateFilters({ privateOnly })
            }
          />
        </div>
      </div>
    </aside>
  );
}
