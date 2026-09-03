export const API_URL = "/api/v1";
export const $ = (selector) => document.querySelector(selector);
export const dateText = (date) => new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
export const shortDate = (date) => new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(new Date(date));

export function getSession() { return { token: localStorage.getItem("alimenta_token"), user: JSON.parse(localStorage.getItem("alimenta_user") || "null") }; }
export function saveSession(data) { localStorage.setItem("alimenta_token", data.token); localStorage.setItem("alimenta_user", JSON.stringify(data.user)); }
export function logout() { localStorage.removeItem("alimenta_token"); localStorage.removeItem("alimenta_user"); window.location.href = "/"; }
const GENERIC_ERRORS = {
  400: "Revisa los datos ingresados e inténtalo de nuevo.",
  401: "Tu sesión no es válida. Ingresa nuevamente.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No encontramos la información solicitada.",
  409: "No se puede completar la acción porque los datos ya existen o cambiaron.",
  413: "El archivo es demasiado grande. Elige una imagen de máximo 5 MB.",
  429: "Hay demasiadas solicitudes. Espera un momento e inténtalo otra vez.",
};

function userMessage(message, status) {
  const cleanMessage = typeof message === "string" ? message.trim() : "";
  const looksTechnical = !cleanMessage
    || /\b(error|exception|stack|cast|mongo|mongoose|jwt|econn|enotfound|\bat\s+\w+\s*\()\b/i.test(cleanMessage)
    || /[a-f0-9]{16,}|\d{8,}/i.test(cleanMessage);
  return looksTechnical ? (GENERIC_ERRORS[status] || "No pudimos completar la acción. Inténtalo de nuevo.") : cleanMessage;
}

export async function api(path, options = {}) {
  const { token } = getSession();
  const isFormData = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  } catch {
    throw new Error("No fue posible conectarse. Revisa tu conexión e inténtalo de nuevo.");
  }
  let data = {};
  try { data = await response.json(); } catch { /* La respuesta no contiene JSON. */ }
  if (!response.ok) throw new Error(userMessage(data.message, response.status));
  return data;
}
export function notify(message, error = false) { const toast = $("#toast"); toast.textContent = message; toast.className = `toast show rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl text-white ${error ? "bg-rose-600" : "bg-slate-900"}`; setTimeout(() => toast.classList.remove("show"), 3500); }
export function make(tag, text, classes) { const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (classes) item.className = classes; return item; }
export function clear(node) { node.replaceChildren(); }
