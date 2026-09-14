"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { addProjectActorAssignment, getUsers } from "../../services/projects";
import { UserSummary } from "../../services/schemas";
import { formatRole, getInitials } from "../../services/utils";
import { useAuth } from "../../components/auth-provider";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

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

  return formatRole(role);
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
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
    <Field className="relative">
      <FieldLabel htmlFor="project-user-search">Usuario</FieldLabel>

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
    </Field>
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
        <Item
          key={user.id}
          render={
            <button type="button" onClick={() => onSelectUser(user)} />
          }
          className="rounded-none border-b border-border last:border-b-0"
        >
          <ItemMedia>
            <Avatar>
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
          </ItemMedia>

          <ItemContent>
            <ItemTitle>{user.fullName}</ItemTitle>
            <ItemDescription>{user.email}</ItemDescription>
          </ItemContent>

          <Badge variant="outline">
            {getRoleLabel(getUserProjectRole(user))}
          </Badge>
        </Item>
      ))}
    </div>
  );
}

function RoleDisplay({ role }: Readonly<{ role: string | null }>) {
  return (
    <Field>
      <FieldLabel htmlFor="project-role">Rol</FieldLabel>

      <Input
        id="project-role"
        value={role ? getRoleLabel(role) : "Selecciona un usuario"}
        readOnly
        disabled
      />
    </Field>
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
        <CardContent className="flex flex-col gap-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4"
            >
              <Avatar>
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                  {getInitials(assignment.user.fullName)}
                </AvatarFallback>
              </Avatar>

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
    <div className="flex flex-col gap-6">
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
