"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "./auth-provider";
import { AuthNav } from "./auth-nav";
import { Button } from "@/components/ui/button";
import { formatRole } from "../services/utils";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"

export default function Navbar() {  const pathname = usePathname();
  const { session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = session?.user.roles.includes("admin") ?? false;
  const userRoles = (session?.user.roles ?? [])
    .map((role) => formatRole(role))
    .join(", ");

  return (
    <nav className="border-b bg-background shadow-sm">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3 sm:px-10 lg:px-12">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={`shrink-0 text-lg font-semibold tracking-tight ${
            pathname === "/" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          CapstoneHUB
        </Link>

        {/* Menú de escritorio: se oculta antes de que le falte espacio */}
        <NavigationMenu className="hidden min-w-0 max-w-none md:flex">
          <NavigationMenuList>

            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link href="/projects">Proyectos</Link>}
              />
            </NavigationMenuItem>

            {isAdmin && (
            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link href="/admin/users">Administración</Link>}
              />
            </NavigationMenuItem>
            )}

            <NavigationMenuItem>
              <NavigationMenuLink
                render={<Link href="/submit">Proponer</Link>}
              />
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto hidden md:flex">
          <AuthNav />
        </div>

        {/* Botón hamburguesa: solo visible cuando no cabe el menú de escritorio */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          className="ml-auto md:hidden"
        >
          {mobileOpen ? (
            <X aria-hidden="true" />
          ) : (
            <Menu aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Panel móvil: repite todo lo que el menú de escritorio esconde */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="border-t bg-background px-6 py-4 sm:px-10 md:hidden"
        >
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="justify-start"
              nativeButton={false}
              render={
                <Link
                  href="/projects"
                  onClick={() => setMobileOpen(false)}
                />
              }
            >
              Proyectos
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                className="justify-start"
                nativeButton={false}
                render={
                  <Link
                    href="/admin/users"
                    onClick={() => setMobileOpen(false)}
                  />
                }
              >
                Administración
              </Button>
            )}

            <Button
              variant="ghost"
              className="justify-start"
              nativeButton={false}
              render={
                <Link
                  href="/submit"
                  onClick={() => setMobileOpen(false)}
                />
              }
            >
              Proponer
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4">
            {session ? (
              <>
                <p className="px-2 text-sm">
                  <span className="block font-medium">
                    {session.user.fullName}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {userRoles || "Sin rol asignado"}
                  </span>
                </p>
                <Button
                  variant="ghost"
                  className="justify-start"
                  nativeButton={false}
                  render={
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                    />
                  }
                >
                  Mi perfil
                </Button>
              </>
            ) : null}
            <div className="px-2">
              <AuthNav showUserInfo={false} />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
