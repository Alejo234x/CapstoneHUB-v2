"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/auth-provider";
import { getUsers, AuthUser } from "../../services/auth";
import CreateUserDialog from "./create-user-dialog";
import EditUserRolesDialog from "./edit-user-roles-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  evaluator: "Evaluador",
  coordinator: "Coordinador",
  advisor: "Asesor",
  student: "Estudiante",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { session, ready, isAuthenticated } = useAuth();

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    const isAdmin = session?.user.roles.includes("admin");

    if (!isAdmin) {
      router.replace("/");
      return;
    }

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);

        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los usuarios.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [ready, isAuthenticated, session, router]);

  if (!ready || loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Skeleton className="h-8 w-56" />
      </main>
    );
  }

  if (!isAuthenticated || !session?.user.roles.includes("admin")) {
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Panel del administrador
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Gestión de usuarios y roles del sistema.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>
            Usuarios registrados en CapstoneHUB.
          </CardDescription>
          <CardAction>
            <CreateUserDialog
              onUserCreated={(user) => {
                setUsers((currentUsers) => [...currentUsers, user]);
              }}
            />
          </CardAction>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No hay usuarios registrados.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.fullName}
                    </TableCell>

                    <TableCell>{user.email}</TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="outline">
                            {roleLabels[role] ?? role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <EditUserRolesDialog
                        user={user}
                        onUserUpdated={(updatedUser) => {
                          setUsers((currentUsers) =>
                            currentUsers.map((currentUser) =>
                              currentUser.id === updatedUser.id
                                ? updatedUser
                                : currentUser,
                            ),
                          );
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
