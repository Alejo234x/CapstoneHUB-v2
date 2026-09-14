"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { addProjectActorAssignment, getUsers } from "../../services/projects";
import { UserSummary } from "../../services/schemas";
import { useAuth } from "../../components/auth-provider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const roleLabels: Record<string, string> = {
  advisor: "Asesor",
  coordinator: "Coordinador",
  student: "Estudiante",
  evaluator: "Evaluador",
};

const assignableRoles = new Set([
  "advisor",
  "coordinator",
  "student",
  "evaluator",
]);

type ProjectActorAssignment = {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  assignedAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
};

type ProjectActorAssignmentPanelProps = {
  projectId: number;
  assignments: ProjectActorAssignment[];
};

function canAssignActors(
  userId: number,
  roles: string[],
  assignments: ProjectActorAssignment[],
): boolean {
  if (roles.includes("admin")) {
    return true;
  }

  if (!roles.includes("coordinator")) {
    return false;
  }

  return assignments.some(
    (assignment) =>
      assignment.userId === userId &&
      assignment.role === "coordinator",
  );
}

function getUserProjectRole(user: UserSummary): string | null {
  return user.roles.find((role) => assignableRoles.has(role)) ?? null;
}

function getRoleLabel(role: string | null): string {
  if (!role) {
    return "Sin rol asignable";
  }

  return roleLabels[role] ?? role;
}

function getInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function useProjectUsers(
  ready: boolean,
  isAuthenticated: boolean,
  canAssign: boolean,
) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !isAuthenticated || !canAssign || users.length > 0) {
      return;
    }

    void getUsers().then(({ users: nextUsers, error }) => {
      if (error) {
        setErrorMessage(error);
        return;
      }

      setUsers(nextUsers);
    });
  }, [canAssign, isAuthenticated, ready, users.length]);

  return {
    users,
    errorMessage,
    setErrorMessage,
  };
}

function AccessMessage() {
  return (
    <Card>
      <CardContent className="pt-6 text-sm text-muted-foreground">
        Cargando acceso...
      </CardContent>
    </Card>
  );
}

function LoginMessage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipo del proyecto</CardTitle>
        <CardDescription>
          Inicia sesión para gestionar el equipo del proyecto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          nativeButton={false}
          render={<Link href="/login">Iniciar sesión</Link>}
        />
      </CardContent>
    </Card>
  );
}

type AssignmentFormProps = {
  projectId: number;
  users: UserSummary[];
  initialError: string | null;
  onErrorChange: (message: string | null) => void;
};

function AssignmentForm({
  projectId,
  users,
  initialError,
  onErrorChange,
}: Readonly<AssignmentFormProps>) {
  const router = useRouter();

  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) => {
      const fullName = user.fullName.toLowerCase();
      const email = user.email.toLowerCase();

      return (
        fullName.includes(normalizedSearch) ||
        email.includes(normalizedSearch)
      );
    });
  }, [search, users]);

  const selectedRole = selectedUser
    ? getUserProjectRole(selectedUser)
    : null;

  function handleSelectUser(user: UserSummary) {
    setSelectedUser(user);
    setSearch("");
    onErrorChange(null);
  }

  function handleSearchChange(value: string) {
    setSelectedUser(null);
    setSearch(value);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onErrorChange(null);

    if (!selectedUser) {
      onErrorChange("Selecciona un usuario.");
      return;
    }

    if (!selectedRole) {
      onErrorChange(
        "El usuario seleccionado no tiene un rol válido para este proyecto.",
      );
      return;
    }

    startTransition(async () => {
      try {
        await addProjectActorAssignment(projectId, {
          userId: selectedUser.id,
          role: selectedRole,
        });

        setSelectedUser(null);
        setSearch("");
        router.refresh();
      } catch (error) {
        onErrorChange(
          error instanceof Error
            ? error.message
            : "No se pudo asignar el usuario",
        );
      }
    });
  }

  const errorMessage = initialError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asignar usuario</CardTitle>
        <CardDescription>
          Busca una persona y asígnala a este proyecto.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <UserSearch
              users={filteredUsers}
              selectedUser={selectedUser}
              search={search}
              isPending={isPending}
              onSearchChange={handleSearchChange}
              onSelectUser={handleSelectUser}
            />

            <RoleDisplay role={selectedRole} />

            <Button
              type="submit"
              disabled={isPending || !selectedUser || !selectedRole}
            >
              {isPending ? "Asignando..." : "Asignar"}
            </Button>
          </div>

          {selectedUser ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Se asignará</span>
              <Badge variant="outline">{selectedUser.fullName}</Badge>
              <span>como</span>
              <Badge variant="secondary">{getRoleLabel(selectedRole)}</Badge>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

type UserSearchProps = {
  users: UserSummary[];
  selectedUser: UserSummary | null;
  search: string;
  isPending: boolean;
  onSearchChange: (value: string) => void;
  onSelectUser: (user: UserSummary) => void;
};

function UserSearch({
  users,
  selectedUser,
  search,
  isPending,
  onSearchChange,
  onSelectUser,
}: Readonly<UserSearchProps>) {
  return (
    <div className="relative space-y-2">
      <Label htmlFor="project-user-search">Usuario</Label>

      <Input
        id="project-user-search"
        value={
          selectedUser
            ? `${selectedUser.fullName} — ${selectedUser.email}`
            : search
        }
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar por nombre o correo..."
        autoComplete="off"
        disabled={isPending}
      />

      {!selectedUser && search.trim() ? (
        <UserSearchResults users={users} onSelectUser={onSelectUser} />
      ) : null}
    </div>
  );
}

function UserSearchResults({
  users,
  onSelectUser,
}: Readonly<{
  users: UserSummary[];
  onSelectUser: (user: UserSummary) => void;
}>) {
  if (users.length === 0) {
    return (
      <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover px-3 py-3 text-sm text-muted-foreground shadow-md">
        No se encontraron usuarios.
      </div>
    );
  }

  return (
    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => onSelectUser(user)}
          className="flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-muted"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(user.fullName)}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {user.fullName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </span>

          <Badge variant="outline">{getRoleLabel(getUserProjectRole(user))}</Badge>
        </button>
      ))}
    </div>
  );
}

function RoleDisplay({ role }: Readonly<{ role: string | null }>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="project-role">Rol</Label>

      <Input
        id="project-role"
        value={role ? getRoleLabel(role) : "Selecciona un usuario"}
        readOnly
        disabled
      />
    </div>
  );
}

function AssignedUsersList({
  assignments,
}: Readonly<{
  assignments: ProjectActorAssignment[];
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios asignados</CardTitle>
        <CardDescription>
          {assignments.length === 0
            ? "No hay usuarios asignados todavía."
            : `${assignments.length} usuario(s) en el equipo.`}
        </CardDescription>
      </CardHeader>

      {assignments.length > 0 ? (
        <CardContent className="space-y-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(assignment.user.fullName)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {assignment.user.fullName}
                  </p>

                  <Badge variant="secondary">
                    {getRoleLabel(assignment.role)}
                  </Badge>
                </div>

                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {assignment.user.email}
                </p>

                <p className="mt-2 text-xs text-muted-foreground">
                  Asignado el {formatDate(assignment.assignedAt)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function ProjectActorAssignmentPanel({
  projectId,
  assignments,
}: ProjectActorAssignmentPanelProps) {
  const { session, isAuthenticated, ready } = useAuth();

  const currentUser = session?.user;
  const userRoles = currentUser?.roles ?? [];

  const canAssign = currentUser
    ? canAssignActors(currentUser.id, userRoles, assignments)
    : false;

  const { users, errorMessage, setErrorMessage } = useProjectUsers(
    ready,
    isAuthenticated,
    canAssign,
  );

  if (!ready) {
    return <AccessMessage />;
  }

  if (!isAuthenticated) {
    return <LoginMessage />;
  }

  return (
    <div className="space-y-6">
      {canAssign ? (
        <AssignmentForm
          projectId={projectId}
          users={users}
          initialError={errorMessage}
          onErrorChange={setErrorMessage}
        />
      ) : null}

      <AssignedUsersList assignments={assignments} />
    </div>
  );
}
