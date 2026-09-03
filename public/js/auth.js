import { api, notify, saveSession, $ } from "./common.js";

function redirectByRole(user) { window.location.href = user.role === "Admin" ? "/admin.html" : "/estudiante.html"; }
const login = $("#login-form");
const register = $("#register-form");
if (login) login.addEventListener("submit", async (event) => { event.preventDefault(); try { const data = await api("/auth/login", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(login))) }); saveSession(data); redirectByRole(data.user); } catch (error) { notify(error.message, true); } });
if (register) {
  for (let i = 1; i <= 11; i += 1) $("#grade").append(new Option(i, i));
  const syncGroups = () => {
    const grade = Number($("#grade").value);
    const limit = grade >= 10 ? 5 : grade >= 6 ? 6 : 8;
    $("#group").replaceChildren(new Option("Selecciona", ""));
    for (let i = 1; i <= limit; i += 1) $("#group").append(new Option(i, i));
  };
  $("#grade").addEventListener("change", syncGroups);
  syncGroups();
  register.addEventListener("submit", async (event) => { event.preventDefault(); try { const data = await api("/auth/register", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(register))) }); saveSession(data); redirectByRole(data.user); } catch (error) { notify(error.message, true); } });
}
