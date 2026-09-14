"use client";

import Link from "next/link";
import { useState } from "react";
import { createProject } from "../services/projects";
import { useAuth } from "./auth-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  name: string;
  namep: string;
  ncedua: string;
  age: number | "";
  correo: string;
  description: string;
  context: string;
  location: string;
  startDate: string;
  executiontime: string;
  estimatedCost: number | "";
};

const initialForm: FormState = {
  name: "",
  namep: "",
  ncedua: "",
  age: "",
  correo: "",
  description: "",
  context: "",
  location: "",
  startDate: "",
  executiontime: "",
  estimatedCost: "",
};

export default function SubmitProjectForm() {
  const { isAuthenticated, ready } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);

  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;

    if (name === "age") {
      if (!/^\d*$/.test(value) || value.length > 2) return;
    }

    if (name === "ncedua") {
      if (!/^\d*$/.test(value) || value.length > 10) return;
    }

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "age" || name === "estimatedCost"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(null);

    try {
      await createProject({
        ...form,
        age: Number(form.age),
        estimatedCost: Number(form.estimatedCost),
      });

      setStatus("success");
      setForm(initialForm);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create project",
      );
    }
  }

  if (!ready) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando acceso...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proponer un proyecto</CardTitle>
          <CardDescription>
            Inicia sesión para proponer nuevos proyectos.
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

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nombre del proyecto</FieldLabel>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="namep">Nombre del responsable</FieldLabel>
          <Input
            id="namep"
            name="namep"
            value={form.namep}
            onChange={handleChange}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="ncedua">Número de cédula</FieldLabel>
          <Input
            id="ncedua"
            name="ncedua"
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={form.ncedua}
            onChange={handleChange}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="correo">Correo electrónico</FieldLabel>
          <Input
            type="email"
            id="correo"
            name="correo"
            value={form.correo}
            onChange={handleChange}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Descripción</FieldLabel>
          <Textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="context">Justificación</FieldLabel>
          <Textarea
            id="context"
            name="context"
            value={form.context}
            onChange={handleChange}
            rows={4}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="location">Locación</FieldLabel>
          <Input
            id="location"
            name="location"
            value={form.location}
            onChange={handleChange}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="startDate">
            Tiempo estimado de inicio
          </FieldLabel>
          <Input
            type="date"
            id="startDate"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="executiontime">
            Tiempo estimado de duracion
          </FieldLabel>
          <Input
            id="executiontime"
            name="executiontime"
            value={form.executiontime}
            onChange={handleChange}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="estimatedCost">Costo estimado</FieldLabel>
          <Input
            type="number"
            id="estimatedCost"
            name="estimatedCost"
            value={form.estimatedCost}
            onChange={handleChange}
            required
          />
        </Field>

        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" && <Spinner data-icon="inline-start" />}
          {status === "saving" ? "Saving..." : "Proponer"}
        </Button>

        {status === "success" && (
          <Alert>
            <AlertDescription>Project created.</AlertDescription>
          </Alert>
        )}

        {status === "error" && errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </FieldGroup>
    </form>
  );
}
