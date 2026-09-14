"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/auth-provider";
import AssignedProjects from "./assigned-projects";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRole, getInitials } from "../services/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { session, ready, isAuthenticated } = useAuth();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Skeleton className="h-8 w-40" />
      </main>
    );
  }

  if (!isAuthenticated || !session) {
    return null;
  }

  const { user } = session;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta tu información y los proyectos en los que participas.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <CardTitle className="truncate">{user.fullName}</CardTitle>
              <CardDescription className="truncate">
                {user.email}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Roles
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.roles.length > 0 ? (
              user.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {formatRole(role)}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                Sin rol asignado
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <AssignedProjects />
    </main>
  );
}
