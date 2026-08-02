import { api, notify, saveSession, $ } from "./common.js";

function redirectByRole(user) { window.location.href = user.role === "Admin" ? "/admin.html" : "/estudiante.html"; }
const login = $("#login-form");
const register = $("#register-form");
if (login) login.addEventListener("submit", async (event) => { event.preventDefault(); try { const data = await api("/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(login))) }); saveSession(data); redirectByRole(data.user); } catch (error) { notify(error.message, true); } });
if (register) {
  for (let i = 1; i <= 11; i += 1) $("#grade").append(new Option(i, i));
  for (let i = 1; i <= 8; i += 1) $("#group").append(new Option(i, i));
  register.addEventListener("submit", async (event) => { event.preventDefault(); try { const data = await api("/auth/register", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(register))) }); saveSession(data); redirectByRole(data.user); } catch (error) { notify(error.message, true); } });
}
