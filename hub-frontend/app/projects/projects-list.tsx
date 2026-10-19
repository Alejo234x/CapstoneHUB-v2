"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import AccessNotice from "../components/access-notice";
import ServiceUnavailable from "../components/service-unavailable";
import { isServiceUnavailableStatus } from "@/lib/http";
import {
  getProjects,
  type ProjectListQuery,
} from "../services/projects";
import { type ProjectItem } from "../services/schemas";
import ProjectListRow from "./project-list-row";
import ProjectListToolbar from "./project-list-toolbar";
import {
  createDefaultFilters,
  isLegalizationValue,
  isProjectSort,
  isProjectSource,
  isProjectStatus,
  type ProjectDensity,
  type ProjectListFilters,
} from "./project-list-config";

type ProjectsListProps = {
  readonly projects: ProjectItem[];
};

type RemoteProjects = {
  queryKey: string;
  projects: ProjectItem[];
  status?: number;
  error: string | null;
};

const PAGE_SIZE = 10;

const FILTER_PARAMS = {
  search: "q",
  status: "estado",
  proposer: "proponente",
  source: "fuente",
  legalization: "legalizacion",
  year: "anio",
  sort: "orden",
} as const;

function filtersFromSearchParams(
  searchParams: URLSearchParams,
): ProjectListFilters {
  const sortParam = searchParams.get(FILTER_PARAMS.sort);

  return {
    search: searchParams.get(FILTER_PARAMS.search) ?? "",
    status: searchParams
      .getAll(FILTER_PARAMS.status)
      .filter(isProjectStatus),
    proposer: searchParams
      .getAll(FILTER_PARAMS.proposer)
      .filter(Boolean),
    source: searchParams
      .getAll(FILTER_PARAMS.source)
      .filter(isProjectSource),
    legalization: searchParams
      .getAll(FILTER_PARAMS.legalization)
      .filter(isLegalizationValue),
    year: searchParams.getAll(FILTER_PARAMS.year).filter(Boolean),
    sort: isProjectSort(sortParam) ? sortParam : "relevance",
  };
}

function filtersToSearchParams(
  filters: ProjectListFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  const search = filters.search.trim();

  if (search) {
    params.set(FILTER_PARAMS.search, search);
  }

  filters.status.forEach((value) =>
    params.append(FILTER_PARAMS.status, value),
  );
  filters.proposer.forEach((value) =>
    params.append(FILTER_PARAMS.proposer, value),
  );
  filters.source.forEach((value) =>
    params.append(FILTER_PARAMS.source, value),
  );
  filters.legalization.forEach((value) =>
    params.append(FILTER_PARAMS.legalization, value),
  );
  filters.year.forEach((value) =>
    params.append(FILTER_PARAMS.year, value),
  );

  if (filters.sort !== "relevance") {
    params.set(FILTER_PARAMS.sort, filters.sort);
  }

  return params;
}

function filtersToApiQuery(
  filters: ProjectListFilters,
): ProjectListQuery {
  const query: ProjectListQuery = { limit: 100 };
  const search = filters.search.trim();

  if (search) {
    query.search = search;
  }

  if (filters.status.length > 0) {
    query.status = filters.status;
  }

  if (filters.proposer.length > 0) {
    query.proposer = filters.proposer;
  }

  if (filters.source.length > 0) {
    query.source = filters.source;
  }

  if (filters.legalization.length === 1) {
    query.requiresLegalization = filters.legalization[0] === "si";
  }

  const years = filters.year
    .filter((year) => year !== "sin-anio")
    .map(Number)
    .filter((year) => Number.isInteger(year));

  if (years.length > 0) {
    query.year = years;
  }

  if (filters.year.includes("sin-anio")) {
    query.withoutYear = true;
  }

  if (filters.sort !== "relevance") {
    query.sort = filters.sort;
  }

  return query;
}

function hasActiveFilters(filters: ProjectListFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.status.length > 0 ||
    filters.proposer.length > 0 ||
    filters.source.length > 0 ||
    filters.legalization.length > 0 ||
    filters.year.length > 0 ||
    filters.sort !== "relevance"
  );
}

function ListPagination({
  pageIndex,
  pageCount,
  onPageChange,
}: {
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly onPageChange: (pageIndex: number) => void;
}) {
  const [pageDraft, setPageDraft] = useState<string | null>(null);
  const currentPage = Math.min(pageIndex + 1, pageCount);

  function commitPage() {
    const parsed = Number.parseInt(pageDraft ?? "", 10);

    if (Number.isNaN(parsed)) {
      setPageDraft(null);
      return;
    }

    onPageChange(Math.min(Math.max(parsed, 1), pageCount) - 1);
    setPageDraft(null);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="projects-page-input">Página</label>

        <Input
          id="projects-page-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={pageCount}
          value={pageDraft ?? String(currentPage)}
          onChange={(event) => setPageDraft(event.target.value)}
          onBlur={commitPage}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitPage();
            }
          }}
          className="h-7 w-14 px-1 text-center"
        />

        <span>de {pageCount}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex <= 0}
        >
          Anterior
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= pageCount - 1}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

export default function ProjectsList({ projects }: ProjectsListProps) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ProjectListFilters>(() =>
    filtersFromSearchParams(searchParams),
  );
  const [density, setDensity] = useState<ProjectDensity>("comfortable");
  const [pageIndex, setPageIndex] = useState(0);
  const [remoteProjects, setRemoteProjects] =
    useState<RemoteProjects | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const apiQuery = useMemo(() => filtersToApiQuery(filters), [filters]);
  const queryKey = useMemo(() => JSON.stringify(apiQuery), [apiQuery]);
  const serverQuery = hasActiveFilters(filters);
  const isRemoteCurrent = remoteProjects?.queryKey === queryKey;
  const currentRemote = isRemoteCurrent ? remoteProjects : null;
  const displayProjects = serverQuery
    ? (remoteProjects?.projects ?? [])
    : projects;
  const remoteLoading = serverQuery && remoteProjects === null;
  const remoteError = serverQuery ? (currentRemote?.error ?? null) : null;
  const remoteStatus = serverQuery ? currentRemote?.status : undefined;

  useEffect(() => {
    if (!serverQuery) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      const result = await getProjects(apiQuery);

      if (!active) {
        return;
      }

      setRemoteProjects({
        queryKey,
        projects: result.projects,
        status: result.status,
        error: result.error ?? null,
      });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [apiQuery, queryKey, reloadKey, serverQuery]);

  useEffect(() => {
    function handlePopState() {
      setFilters(
        filtersFromSearchParams(
          new URLSearchParams(window.location.search),
        ),
      );
      setPageIndex(0);
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const params = filtersToSearchParams(filters);
    const nextSearch = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, "");

    if (nextSearch === currentSearch) {
      return;
    }

    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ""
    }${window.location.hash}`;

    window.history.replaceState(null, "", nextUrl);
  }, [filters]);

  const pageCount = Math.max(
    1,
    Math.ceil(displayProjects.length / PAGE_SIZE),
  );
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const paginatedProjects = displayProjects.slice(
    safePageIndex * PAGE_SIZE,
    (safePageIndex + 1) * PAGE_SIZE,
  );

  function handleFiltersChange(nextFilters: ProjectListFilters) {
    setFilters(nextFilters);
    setPageIndex(0);
  }

  function clearFilters() {
    setFilters(createDefaultFilters());
    setPageIndex(0);
  }

  return (
    <div>
      <ProjectListToolbar
        projects={projects}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        density={density}
        onDensityChange={setDensity}
        onClearFilters={clearFilters}
      />

      {remoteLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : remoteStatus === 401 ? (
        <AccessNotice
          className="rounded-2xl"
          title="Inicia sesión para ver los proyectos"
          message="Solo los proyectos finalizados y públicos se pueden consultar sin cuenta. Inicia sesión para ver tus proyectos propuestos y asignados."
        />
      ) : isServiceUnavailableStatus(remoteStatus) ? (
        <ServiceUnavailable
          className="mb-6"
          message={remoteError}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : remoteError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{remoteError}</AlertDescription>
        </Alert>
      ) : displayProjects.length > 0 ? (
        <>
          <p className="px-1 pb-2 text-xs text-muted-foreground">
            {displayProjects.length}{" "}
            {displayProjects.length === 1 ? "proyecto" : "proyectos"}
          </p>

          <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-utb-blue/10">
            <ul className="divide-y divide-border">
              {paginatedProjects.map((project) => (
                <ProjectListRow
                  key={project.id}
                  project={project}
                  density={density}
                />
              ))}
            </ul>
          </div>

          <ListPagination
            pageIndex={safePageIndex}
            pageCount={pageCount}
            onPageChange={setPageIndex}
          />
        </>
      ) : (
        <Empty className="rounded-2xl bg-card shadow-sm ring-1 ring-utb-blue/10">
          <EmptyHeader>
            <EmptyTitle>No hay proyectos con esos filtros</EmptyTitle>
            <EmptyDescription>
              Prueba a cambiar la búsqueda o a limpiar los filtros
              seleccionados.
            </EmptyDescription>
          </EmptyHeader>

          {hasActiveFilters(filters) ? (
            <EmptyContent>
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      )}
    </div>
  );
}
