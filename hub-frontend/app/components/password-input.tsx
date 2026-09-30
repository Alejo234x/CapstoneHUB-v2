"use client";

import { useState } from "react";
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

/**
 * Campo de contraseña con botón para mostrar u ocultar el valor. Envuelve el
 * `Input` de shadcn para conservar sus estilos y estados.
 */
export default function PasswordInput({
  className,
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-9", className)}
      />

      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? (
          <RiEyeOffLine className="size-4" aria-hidden="true" />
        ) : (
          <RiEyeLine className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
