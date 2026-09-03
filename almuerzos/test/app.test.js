import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("expone un health check", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, status: "healthy" });
});

test("protege el perfil cuando no hay token", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/me`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).ok, false);
});

test("valida los campos obligatorios antes de consultar la base de datos", async () => {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Nombre, correo y contrasena/);
});

test("responde 404 de forma consistente", async () => {
  const response = await fetch(`${baseUrl}/api/v1/no-existe`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).ok, false);
});
