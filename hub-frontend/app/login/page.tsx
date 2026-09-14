import LoginForm from "./login-form";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12 sm:px-10 lg:px-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Acceso privado
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Inicia sesión para editar proyectos
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Los visitantes públicos pueden consultar los proyectos, pero solo
              los usuarios autenticados pueden crear propuestas, actualizar
              estados y añadir observaciones.
            </p>
          </div>

          <Card className="h-fit">
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
