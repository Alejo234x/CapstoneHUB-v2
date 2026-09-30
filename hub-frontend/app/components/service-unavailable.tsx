"use client";

import { RiRefreshLine } from "@remixicon/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/http";
import { cn } from "@/lib/utils";

type ServiceUnavailableProps = {
  message?: string | null;
  onRetry?: () => void;
  className?: string;
};

/**
 * Aviso reutilizable para cuando el backend o la base de datos no responden.
 * Opcionalmente ofrece reintentar la carga.
 */
export default function ServiceUnavailable({
  message,
  onRetry,
  className,
}: ServiceUnavailableProps) {
  return (
    <Alert variant="destructive" className={cn(className)}>
      <AlertTitle>Servicio no disponible</AlertTitle>
      <AlertDescription>
        {message || SERVICE_UNAVAILABLE_MESSAGE}

        {onRetry ? (
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RiRefreshLine className="size-4" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
