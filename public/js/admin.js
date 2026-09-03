import { $, api, clear, dateText, dateTimeText, getServerNow, getSession, logout, make, menuDateValue, notify, serverDateValue, setupMobileSidebar, shortDate } from "./common.js";

const { user } = getSession();
if (!user || user.role !== "Admin") window.location.href = "/";

let menus = [];
let page = 1;
let serverNow = new Date();

$("#user-name").textContent = user.name;
$("#user-initial").textContent = user.name[0];
getServerNow().then((now) => { serverNow = now; $("#today-date").textContent = dateText(now); }).catch(() => { $("#today-date").textContent = dateText(serverNow); });
$("#logout").addEventListener("click", logout);
const closeMobileSidebar = setupMobileSidebar();
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => changeView(button.dataset.view)));
$("#overview-new-menu").addEventListener("click", () => openMenuForm());
$("#new-menu").addEventListener("click", () => openMenuForm());
$("#close-modal").addEventListener("click", closeMenuForm);
$("#menu-form").addEventListener("submit", saveMenu);
$("#new-user").addEventListener("click", openUserForm);
$("#close-user-modal").addEventListener("click", closeUserForm);
$("#user-form").addEventListener("submit", saveUser);
$("#edit-student-form").addEventListener("submit", saveStudent);
$("#close-student-modal").addEventListener("click", closeStudentForm);
$("#user-role").addEventListener("change", toggleStudentFields);
$("#previous").addEventListener("click", () => { page -= 1; loadUsers(); });
$("#next").addEventListener("click", () => { page += 1; loadUsers(); });

function changeView(view) {
  closeMobileSidebar();
  document.querySelectorAll(".view").forEach((item) => item.classList.add("hidden"));
  $("#" + view + "-view").classList.remove("hidden");
  document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  if (view === "overview") loadOverview();
  if (view === "menus") loadMenus();
  if (view === "users") loadUsers();
}

async function loadOverview() {
  try {
    menus = (await api("/menus")).menus;
    const today = menus.find((menu) => menuDateValue(menu.fecha) === serverDateValue(serverNow)) || menus[0];
    const attendance = today ? await api(`/attendance/menus/${today._id}`) : { total: 0, asistiran: 0, noAsistiran: 0, confirmations: [] };
    $("#greeting").textContent = `Buenos días, ${user.name.split(" ")[0]}`;
    $("#total-responses").textContent = attendance.total;
    $("#attending").textContent = attendance.asistiran;
    $("#not-attending").textContent = attendance.noAsistiran;
    $("#total-menus").textContent = menus.length;
    const list = $("#recent-list");
    clear(list);
    attendance.confirmations.slice(0, 5).forEach((item) => {
      const row = make("div", undefined, "py-3 flex justify-between");
      const student = item.estudianteId;
      const identity = student ? `${student.name} — ${student.grado}°` : "Estudiante no disponible";
      row.append(make("span", identity, "font-semibold text-sm"), make("span", item.asistira ? "Asiste" : "No asiste", "text-sm text-slate-500"));
      list.append(row);
    });
    if (!attendance.confirmations.length) list.append(make("p", "Todavía no hay confirmaciones.", "py-8 text-center text-slate-400"));
  } catch (error) { notify(error.message, true); }
}

async function loadMenus() {
  try {
    menus = (await api("/menus")).menus;
    const list = $("#menus-list");
    clear(list);
    const publishedMenus = menus.filter((menu) => menu.estado === "Publicado");
    const summary = make("p", `${publishedMenus.length}/5 menús publicados esta semana. Cada día solo puede tener uno.`, "text-sm text-slate-500 -mt-4 mb-2");
    list.append(summary);
    menus.forEach((menu) => {
      const row = make("article", undefined, "bg-white panel rounded-2xl p-5 flex flex-col md:flex-row gap-5 md:items-center");
      const info = make("div", undefined, "flex-1");
      const visibleDay = menu.estado === "Publicado" ? ` · ${menu.diaSemana}` : "";
      info.append(make("h2", menu.platoPrincipal, "font-bold text-lg"), make("p", `${shortDate(menu.fecha)} · ${menu.estado}${visibleDay}`, "text-sm text-slate-500 mt-1"));
      if (menu.imagenes?.length) {
        const pictures = make("div", undefined, "flex gap-2 mt-3");
        menu.imagenes.slice(0, 3).forEach((source) => { const image = document.createElement("img"); image.src = source; image.alt = `Imagen de ${menu.platoPrincipal}`; image.className = "w-16 h-16 rounded-xl object-cover"; pictures.append(image); });
        info.append(pictures);
      }
      const actions = make("div");
      const edit = make("button", "Editar", "rounded-xl px-3 py-2 bg-slate-100 text-slate-600");
      edit.addEventListener("click", () => openMenuForm(menu));
      const remove = make("button", "Eliminar", "rounded-xl px-3 py-2 bg-rose-50 text-rose-600 ml-2");
      remove.addEventListener("click", () => deleteMenu(menu._id));
      if (menu.estado === "Publicado") {
        const withdraw = make("button", "Retirar de semana", "rounded-xl px-3 py-2 bg-amber-50 text-amber-700 mr-2");
        withdraw.addEventListener("click", () => withdrawMenu(menu._id));
        actions.append(withdraw);
      }
      actions.append(edit, remove); row.append(info, actions); list.append(row);
    });
    if (!menus.length) list.append(make("p", "Aún no hay menús creados.", "bg-white rounded-3xl p-12 text-center text-slate-500"));
  } catch (error) { notify(error.message, true); }
}

function openMenuForm(menu) {
  $("#menu-form").reset(); $("#menu-id").value = menu?._id || "";
  $("#form-title").textContent = menu ? "Editar menú" : "Nuevo menú";
  $("#menu-date-input").value = menu ? menuDateValue(menu.fecha) : serverDateValue(serverNow);
  $("#menu-weekday").value = menu?.diaSemana || "";
  if (menu) {
    $("#menu-main").value = menu.platoPrincipal; $("#menu-side").value = menu.acompanamiento || "";
    $("#menu-drink").value = menu.bebida || ""; $("#menu-description").value = menu.descripcion || "";
  }
  $("#menu-modal").classList.remove("hidden"); $("#menu-modal").classList.add("flex");
}

function closeMenuForm() { $("#menu-modal").classList.add("hidden"); $("#menu-modal").classList.remove("flex"); }

async function saveMenu(event) {
  event.preventDefault(); const id = $("#menu-id").value;
  try {
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    delete payload.images;
    payload.estado = event.submitter?.dataset.menuStatus || "Borrador";
    const response = await api(`/menus${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) });
    const images = $("#menu-images").files;
    if (images.length) {
      const formData = new FormData();
      [...images].forEach((image) => formData.append("images", image));
      await api(`/menus/${response.menu._id}/images`, { method: "POST", body: formData });
    }
    notify(payload.estado === "Publicado" ? "El menú se publicó en la vista semanal." : "Menú guardado en la biblioteca."); closeMenuForm(); loadMenus();
  } catch (error) { notify(error.message, true); }
}

async function withdrawMenu(id) {
  try {
    await api(`/menus/${id}`, { method: "PATCH", body: JSON.stringify({ estado: "Borrador" }) });
    notify("El menú fue retirado de la vista semanal y sigue guardado en la biblioteca."); loadMenus();
  } catch (error) { notify(error.message, true); }
}

async function deleteMenu(id) {
  if (!confirm("¿Eliminar este menú?")) return;
  try { await api(`/menus/${id}`, { method: "DELETE" }); notify("Menú eliminado."); loadMenus(); } catch (error) { notify(error.message, true); }
}

function openUserForm() {
  $("#user-form").reset(); toggleStudentFields();
  $("#user-modal").classList.remove("hidden"); $("#user-modal").classList.add("flex");
}

function closeUserForm() { $("#user-modal").classList.add("hidden"); $("#user-modal").classList.remove("flex"); }

function openStudentForm(student) {
  $("#edit-student-id").value = student._id;
  $("#edit-student-name").value = student.name;
  $("#edit-student-grade").value = student.grado;
  $("#student-modal").classList.remove("hidden"); $("#student-modal").classList.add("flex");
}

function closeStudentForm() { $("#student-modal").classList.add("hidden"); $("#student-modal").classList.remove("flex"); }

async function saveStudent(event) {
  event.preventDefault();
  const id = $("#edit-student-id").value;
  try {
    await api(`/auth/students/${id}`, { method: "PATCH", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    notify("Estudiante actualizado correctamente."); closeStudentForm(); loadUsers();
  } catch (error) { notify(error.message, true); }
}

function toggleStudentFields() {
  const isStudent = $("#user-role").value === "Estudiante";
  $("#student-fields").classList.toggle("hidden", !isStudent);
  $("#user-grade").required = isStudent; $("#user-group").required = isStudent;
  if (!isStudent) { $("#user-grade").value = ""; $("#user-group").value = ""; }
}

async function saveUser(event) {
  event.preventDefault();
  try {
    await api("/auth/users", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    notify("Usuario creado correctamente."); closeUserForm(); page = 1; loadUsers();
  } catch (error) { notify(error.message, true); }
}

async function loadUsers() {
  try {
    const data = await api(`/auth/users?page=${page}&limit=10`);
    const body = $("#users-body"); clear(body);
    $("#users-summary").textContent = `${data.total} usuarios registrados.`;
    $("#page-label").textContent = `Página ${data.page} de ${data.pages}`;
    $("#previous").disabled = data.page <= 1; $("#next").disabled = data.page >= data.pages;
    data.users.forEach((account) => {
      const row = make("tr", undefined, "border-t");
      row.append(make("td", account.name, "p-5"), make("td", account.email, "p-5 text-slate-500"), make("td", account.role === "Admin" ? "Administrador" : "Estudiante", "p-5"), make("td", account.role === "Estudiante" ? `${account.grado} / ${account.grupo}` : "—", "p-5"), make("td", dateTimeText(account.createdAt), "p-5 text-slate-500"));
      const actions = make("td", undefined, "p-5");
      if (account.role === "Estudiante") {
        const edit = make("button", "Editar", "rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-brand-700");
        edit.addEventListener("click", () => openStudentForm(account));
        actions.append(edit);
      } else actions.textContent = "—";
      row.append(actions);
      body.append(row);
    });
  } catch (error) { notify(error.message, true); }
}

loadOverview();
