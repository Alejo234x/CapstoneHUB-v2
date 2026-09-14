"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRole } from "../services/utils";

export function AuthNav({
  showUserInfo = true,
}: {
  showUserInfo?: boolean;
}) {

  const { session, isAuthenticated, ready, logout } = useAuth();

  const userRoles = (session?.user.roles ?? [])
    .map((role) => formatRole(role))
    .join(", ");

    return (
        <div className="flex shrink-0 items-center gap-3">
            {!ready ? (
            <Skeleton className="h-8 w-24" />
            ) : isAuthenticated ? (
            <>
                {showUserInfo ? (
                <Link
                href="/profile"
                className="hidden text-right text-sm transition-colors hover:underline sm:inline"
                >
                <span className="block font-medium">{session?.user.fullName}</span>
                <span className="block text-xs text-muted-foreground">
                    {userRoles || "Sin rol asignado"}
                </span>
                </Link>
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
