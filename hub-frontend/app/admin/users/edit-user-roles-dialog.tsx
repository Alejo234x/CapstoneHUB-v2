"use client";

import FormActions from "@/app/components/form-actions";
import { useEffect, useState } from "react";
import { updateUserRoles, AuthUser } from "@/app/services/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

const availableRoles = [
  { value: "admin", label: "Administrador" },
  { value: "evaluator", label: "Evaluador" },
  { value: "coordinator", label: "Coordinador" },
  { value: "advisor", label: "Asesor" },
  { value: "student", label: "Estudiante" },
];

type EditUserRolesDialogProps = {
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
};

export default function EditUserRolesDialog({
  user,
  onUserUpdated,
}: EditUserRolesDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedRoles(user.roles);
      setError(null);
    }
  }, [open, user.roles]);

  function toggleRole(role: string) {
    setSelectedRoles((currentRoles) =>
      currentRoles.includes(role)
        ? currentRoles.filter((currentRole) => currentRole !== role)
        : [...currentRoles, role],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedRoles.length === 0) {
      setError("El usuario debe tener al menos un rol.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updatedUser = await updateUserRoles(
        user.id,
        selectedRoles,
      );

      onUserUpdated(updatedUser);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron actualizar los roles.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);

        if (!value) {
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="outline">Editar roles</Button>}
      >
        Editar roles
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar roles</DialogTitle>

          <DialogDescription>
            Modifica los roles asignados a {user.fullName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldSet>
              <FieldLegend variant="label">Roles</FieldLegend>

              <FieldGroup className="gap-3">
                {availableRoles.map((role) => (
                  <Field key={role.value} orientation="horizontal">
                    <Checkbox
                      id={`role-${user.id}-${role.value}`}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                      disabled={loading}
                    />

                    <FieldLabel
                      htmlFor={`role-${user.id}-${role.value}`}
                      className="font-normal"
                    >
                      {role.label}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
            </FieldSet>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <FormActions
              loading={loading}
              loadingText="Guardando..."
              submitText="Guardar cambios"
              onCancel={() => setOpen(false)}
            />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
