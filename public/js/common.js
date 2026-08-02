export const API_URL = "/api/v1";
export const $ = (selector) => document.querySelector(selector);
export const dateText = (date) => new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
export const shortDate = (date) => new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(new Date(date));

export function getSession() {
  try {
    return {
      token: localStorage.getItem("alimenta_token"),
      user: JSON.parse(localStorage.getItem("alimenta_user") || "null"),
    };
  } catch {
    localStorage.removeItem("alimenta_token");
    localStorage.removeItem("alimenta_user");
    return { token: null, user: null };
  }
}
export function saveSession(data) { localStorage.setItem("alimenta_token", data.token); localStorage.setItem("alimenta_user", JSON.stringify(data.user)); }
export function logout() { localStorage.removeItem("alimenta_token"); localStorage.removeItem("alimenta_user"); window.location.href = "/"; }
export async function api(path, options = {}) {
  const { token } = getSession();
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers || {});

  if (!isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = await response.text();
  let data = {};

  try {
    data = payload ? JSON.parse(payload) : {};
  } catch {
    if (!response.ok) throw new Error(`El servidor respondio con ${response.status}. Intenta de nuevo.`);
  }

  if (!response.ok) throw new Error(data.message || "Ocurrio un error al comunicarse con el servidor.");
  return data;
}
export function notify(message, error = false) { const toast = $("#toast"); toast.textContent = message; toast.className = `toast show rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl text-white ${error ? "bg-rose-600" : "bg-slate-900"}`; setTimeout(() => toast.classList.remove("show"), 3500); }
export function make(tag, text, classes) { const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (classes) item.className = classes; return item; }
export function clear(node) { node.replaceChildren(); }
