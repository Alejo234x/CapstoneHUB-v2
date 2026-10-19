"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/http";
import { useApiResource } from "@/lib/use-api-resource";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../../components/auth-provider";
import ModuleHeader from "../../components/module-header";
import ServiceUnavailable from "../../components/service-unavailable";
import { getKpis, canViewKpis } from "../../services/stats";
import KpiActivity from "./kpi-activity";
import KpiHighlights from "./kpi-highlights";
import KpiPending from "./kpi-pending";

export default function KpisPage() {
  const router = useRouter();
  const { session, ready, isAuthenticated } = useAuth();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login?next=/profile/kpis");
    }
  }, [ready, isAuthenticated, router]);

  const canView = session ? canViewKpis(session.user.roles) : false;

  const {
    data: kpis,
    loading,
    error,
    reload,
  } = useApiResource(() => (canView ? getKpis() : Promise.resolve(null)), [
    canView,
  ]);

  let content: ReactNode;

  if (!ready || (canView && loading)) {
    content = (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  } else if (!isAuthenticated) {
    content = null;
  } else if (!canView) {
    content = (
      <Alert>
        <AlertDescription>
          El panel de indicadores está disponible para docentes, evaluadores y
          administradores.
        </AlertDescription>
      </Alert>
    );
  } else if (error === SERVICE_UNAVAILABLE_MESSAGE) {
    content = <ServiceUnavailable message={error} onRetry={reload} />;
  } else if (error) {
    content = (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  } else if (kpis) {
    content = (
      <>
        <KpiHighlights kpis={kpis} />
        <KpiPending kpis={kpis} />
        <KpiActivity myReviews={kpis.myReviews} />
      </>
    );
  } else {
    content = null;
  }

  return (
    <main className="flex-1 text-foreground">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ModuleHeader
          eyebrow="Mi cuenta"
          title="Indicadores"
          accentColor="rgba(34,211,238,0.28)"
        />

        {content}
      </section>
    </main>
  );
}
