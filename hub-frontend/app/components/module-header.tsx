import type { ReactNode } from "react";
import { RiTeamLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

export interface ModuleHeaderProps {
  title: ReactNode;
  /** Etiqueta superior que diferencia cada módulo. Ej: "Gestión de proyectos". */
  eyebrow?: string;
  /** Color del glow: da identidad propia a cada módulo. */
  accentColor?: string;
  /** Personas asignadas al equipo. Si se omite, no se muestra el contador. */
  teamSize?: number;
  className?: string;
}

/**
 * Header estándar de módulo: barra horizontal compacta con el degradado UTB,
 * rejilla sutil, eyebrow, título y el tamaño del equipo a la derecha. Lo
 * comparten todas las pantallas para que la app se vea simétrica; la
 * diferenciación es por `accentColor` / `eyebrow` / `title`.
 *
 * La animación es CSS puro (`utb-rise` en globals.css), así que el componente
 * se renderiza en el servidor y respeta `prefers-reduced-motion`.
 */
export function ModuleHeader({
  title,
  eyebrow,
  accentColor = "rgba(37,99,235,0.42)",
  teamSize,
  className,
}: Readonly<ModuleHeaderProps>) {
  return (
    <div
      className={cn(
        "utb-rise noise-overlay relative mb-5 overflow-hidden rounded-xl bg-gradient-to-br from-utb-deep-blue via-utb-navy to-utb-blue/40 px-4 py-3 sm:px-5",
        className
      )}
    >
      {/* Glow del acento */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 75% 65% at 70% 50%, ${accentColor} 0%, transparent 70%)`,
        }}
      />
      {/* Rejilla sutil */}
      <div className="grid-lines-dark pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative z-10 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-bold tracking-[0.18em] text-utb-blue-pale/70 uppercase sm:text-[11px] sm:tracking-[0.22em]">
              {eyebrow}
            </p>
          ) : null}

          <h1 className="text-lg leading-tight font-semibold tracking-tight text-white sm:text-xl">
            {title}
          </h1>
        </div>

        {teamSize != null ? (
          <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 sm:self-auto">
            <RiTeamLine
              className="size-4 text-utb-blue-pale"
              aria-hidden="true"
            />
            <span>
              {teamSize}{" "}
              {teamSize === 1 ? "persona en el equipo" : "personas en el equipo"}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ModuleHeader;
