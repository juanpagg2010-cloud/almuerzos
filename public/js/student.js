import { $, api, clear, dateText, getSession, logout, make, notify, setupMobileSidebar, shortDate } from "./common.js";

const { user } = getSession();
if (!user || user.role !== "Estudiante") window.location.href = "/";

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

$("#user-name").textContent = user.name;
$("#user-initial").textContent = user.name[0];
$("#today-date").textContent = dateText(new Date());
$("#logout").addEventListener("click", logout);
const closeMobileSidebar = setupMobileSidebar();
document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

function switchView(view) {
  closeMobileSidebar();
  document.querySelectorAll(".view").forEach((item) => item.classList.add("hidden"));
  $("#" + view + "-view").classList.remove("hidden");
  document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  if (view === "history") loadHistory();
  else loadMenus();
}

function makeMenuCard(menu, confirmation) {
  const card = make("article", undefined, "bg-white panel rounded-3xl overflow-hidden flex flex-col");
  if (menu.imagenes?.[0]) {
    const image = document.createElement("img");
    image.src = menu.imagenes[0];
    image.alt = `Imagen de ${menu.platoPrincipal}`;
    image.className = "w-full h-48 object-cover";
    card.append(image);
  }

  const content = make("div", undefined, "p-6 flex flex-col flex-1");
  const badges = make("div", undefined, "flex justify-between gap-3");
  badges.append(make("span", menu.diaSemana, "text-xs font-bold uppercase bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full"));
  badges.append(make("span", shortDate(menu.fecha), "text-xs font-semibold text-slate-400 py-1.5"));
  content.append(badges, make("h2", menu.platoPrincipal, "display text-2xl font-extrabold mt-5"));
  if (menu.descripcion) content.append(make("p", menu.descripcion, "text-slate-500 mt-2 text-sm"));

  const details = make("div", undefined, "grid grid-cols-2 gap-3 mt-6 text-sm");
  details.append(make("p", `Acompañamiento: ${menu.acompanamiento || "Por definir"}`, "border-l-2 border-brand-200 pl-3"));
  details.append(make("p", `Bebida: ${menu.bebida || "Por definir"}`, "border-l-2 border-brand-200 pl-3"));
  content.append(details);

  const response = make("div", undefined, "mt-6 pt-5 border-t");
  if (confirmation) {
    response.append(make("p", confirmation.asistira ? "✓ Confirmaste tu asistencia" : "Tu ausencia quedó registrada", "font-bold text-sm text-emerald-700"));
  } else {
    response.append(make("p", "¿Almorzarás este día?", "font-bold text-sm"));
    const actions = make("div", undefined, "flex gap-3 mt-3");
    const yes = make("button", "Sí, asistiré", "flex-1 bg-brand-600 text-white font-bold py-2.5 rounded-xl text-sm");
    const no = make("button", "No asistiré", "flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm");
    yes.addEventListener("click", () => confirmAttendance(menu._id, true));
    no.addEventListener("click", () => confirmAttendance(menu._id, false));
    actions.append(yes, no);
    response.append(actions);
  }
  content.append(response);
  card.append(content);
  return card;
}

async function loadMenus() {
  try {
    const [menusData, attendanceData] = await Promise.all([api("/menus"), api("/attendance/me")]);
    const menus = menusData.menus.sort((a, b) => WEEKDAYS.indexOf(a.diaSemana) - WEEKDAYS.indexOf(b.diaSemana));
    const list = $("#menus-list");
    clear(list);
    $("#greeting").textContent = `Hola, ${user.name.split(" ")[0]}`;
    $("#empty-menu").classList.toggle("hidden", menus.length > 0);
    menus.forEach((menu) => {
      const confirmation = attendanceData.confirmations.find((item) => item.menuId?._id === menu._id);
      list.append(makeMenuCard(menu, confirmation));
    });
  } catch (error) {
    notify(error.message, true);
  }
}

async function confirmAttendance(menuId, asistira) {
  try {
    await api(`/attendance/menus/${menuId}`, { method: "PUT", body: JSON.stringify({ asistira }) });
    notify("Respuesta registrada.");
    loadMenus();
  } catch (error) {
    notify(error.message, true);
  }
}

async function loadHistory() {
  try {
    const { confirmations } = await api("/attendance/me");
    const body = $("#history-body");
    clear(body);
    confirmations.forEach((item) => {
      const row = make("tr", undefined, "border-t");
      row.append(
        make("td", shortDate(item.menuId?.fecha), "p-5"),
        make("td", item.menuId?.platoPrincipal || "Menú eliminado", "p-5"),
        make("td", item.asistira ? "Asistiré" : "No asistiré", "p-5"),
      );
      body.append(row);
    });
  } catch (error) {
    notify(error.message, true);
  }
}

loadMenus();
