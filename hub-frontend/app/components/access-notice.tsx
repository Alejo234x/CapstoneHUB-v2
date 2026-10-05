"use client";

import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AccessNoticeProps = {
  message: string;
  /** Encabezado; solo se usa en la variante `card`. */
  title?: string;
  variant?: "card" | "alert";
  className?: string;
};

/**
 * Aviso reutilizable para las pantallas que requieren sesión. Usa `alert` dentro
 * de un panel existente y `card` cuando el aviso es la superficie principal.
 */
export default function AccessNotice({
  message,
  title = "Inicia sesión",
  variant = "card",
  className,
}: AccessNoticeProps) {
  const loginButton = (
    <Button
      nativeButton={false}
      render={<Link href="/login">Iniciar sesión</Link>}
    />
  );

  if (variant === "alert") {
    return (
      <Alert className={cn(className)}>
        <AlertDescription>
          {message}
          <div className="mt-3">{loginButton}</div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>{loginButton}</CardContent>
    </Card>
  );
}
