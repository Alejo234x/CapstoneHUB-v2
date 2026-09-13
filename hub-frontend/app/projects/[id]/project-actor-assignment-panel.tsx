"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { addProjectActorAssignment, getUsers } from "../../services/projects";
import { UserSummary } from "../../services/schemas";
import { useAuth } from "../../components/auth-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  return (
    user.roles.find((role) => assignableRoles.has(role)) ?? null
  );
}

function getRoleLabel(role: string | null): string {
  if (!role) {
    return "Sin rol asignable";
  }

  return roleLabels[role] ?? role;
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
    <div className="mt-6 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Cargando acceso...
    </div>
  );
}

function LoginMessage() {
  return (
    <div className="mt-6 border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      Inicia sesión para gestionar el equipo del proyecto.

      <div className="mt-3">
        <Link href="/login">
          <Button>Iniciar sesión</Button>
        </Link>
      </div>
    </div>
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
}: AssignmentFormProps) {
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
    <form
      onSubmit={handleSubmit}
      className="border border-slate-200 bg-slate-50 p-4"
    >
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

      {selectedUser && (
        <div className="mt-3 text-xs text-slate-500">
          Se asignará <strong>{selectedUser.fullName}</strong> como{" "}
          <strong>{getRoleLabel(selectedRole)}</strong>.
        </div>
      )}

      {errorMessage ? (
        <p className="mt-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </form>
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
}: UserSearchProps) {
  return (
    <div className="relative">
      <label
        htmlFor="project-user-search"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
      >
        Usuario
      </label>

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
        className="mt-2"
      />

      {!selectedUser && search.trim() && (
        <UserSearchResults users={users} onSelectUser={onSelectUser} />
      )}
    </div>
  );
}

function UserSearchResults({
  users,
  onSelectUser,
}: {
  users: UserSummary[];
  onSelectUser: (user: UserSummary) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 shadow-md">
        No se encontraron usuarios.
      </div>
    );
  }

  return (
    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-md">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => onSelectUser(user)}
          className="block w-full border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-slate-50"
        >
          <p className="text-sm font-medium text-slate-900">
            {user.fullName}
          </p>

          <p className="text-xs text-slate-500">{user.email}</p>

          <p className="mt-1 text-xs font-medium text-slate-600">
            Rol: {getRoleLabel(getUserProjectRole(user))}
          </p>
        </button>
      ))}
    </div>
  );
}

function RoleDisplay({ role }: { role: string | null }) {
  return (
    <div>
      <label
        htmlFor="project-role"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
      >
        Rol
      </label>

      <div
        id="project-role"
        className="mt-2 flex h-9 w-full items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700"
      >
        {role ? getRoleLabel(role) : "Selecciona un usuario"}
      </div>
    </div>
  );
}

function AssignedUsersList({
  assignments,
}: {
  assignments: ProjectActorAssignment[];
}) {
  return (
    <div className="bg-white">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Usuarios asignados
      </h3>

      <div className="mt-4 space-y-3">
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-600">
            No hay usuarios asignados todavía.
          </p>
        ) : (
          assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">
                  {assignment.user.fullName}
                </p>

                <span className="inline-flex w-fit bg-blue-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
                  {getRoleLabel(assignment.role)}
                </span>
              </div>

              <p className="mt-1 text-slate-600">
                {assignment.user.email}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Asignado el {formatDate(assignment.assignedAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
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

  const {
    users,
    errorMessage,
    setErrorMessage,
  } = useProjectUsers(ready, isAuthenticated, canAssign);

  if (!ready) {
    return <AccessMessage />;
  }

  if (!isAuthenticated) {
    return <LoginMessage />;
  }

  return (
    <div className="mt-6 space-y-4">
      {canAssign && (
        <AssignmentForm
          projectId={projectId}
          users={users}
          initialError={errorMessage}
          onErrorChange={setErrorMessage}
        />
      )}

      <AssignedUsersList assignments={assignments} />
    </div>
  );
}
