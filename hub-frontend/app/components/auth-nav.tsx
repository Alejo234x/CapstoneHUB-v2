"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthNav({
  showUserInfo = true,
}: {
  showUserInfo?: boolean;
}) {

  const { session, isAuthenticated, ready, logout } = useAuth();

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    evaluator: "Evaluador",
    coordinator: "Coordinador",
    advisor: "Asesor",
    student: "Estudiante",
  };

  const userRoles = (session?.user.roles ?? [])
    .map((role) => roleLabels[role] ?? role)
    .join(", ");

    return (
        <div className="flex shrink-0 items-center gap-3">
            {!ready ? (
            <Skeleton className="h-8 w-24" />
            ) : isAuthenticated ? (
            <>
                {showUserInfo ? (
                <span className="hidden text-right text-sm sm:inline">
                <span className="block font-medium">{session?.user.fullName}</span>
                <span className="block text-xs text-muted-foreground">
                    {userRoles || "Sin rol asignado"}
                </span>
                </span>
                ) : null}
                <Button variant="outline" onClick={logout}>
                Cerrar sesión
                </Button>
            </>
            ) : (
            <Button
                nativeButton={false}
                render={<Link href="/login">Iniciar sesión</Link>}
            />
            )}
        </div>
    )
}
