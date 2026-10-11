import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./support";

test("crea una cuenta y redirige al envío de propuesta", async ({ page }) => {
  const email = uniqueEmail("register");

  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("Usuario Registro");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page).toHaveURL(/\/submit/);
});
