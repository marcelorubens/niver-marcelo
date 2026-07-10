const SUPABASE_CONFIG = window.NIVER_SUPABASE || {};
const SUPABASE_PLACEHOLDER_KEY = "PASTE_SUPABASE_ANON_KEY_HERE";
const ADMIN_PASSWORD_STORAGE_KEY = "niver-marcelo-lista-password";
const list = document.querySelector("#rsvpList");
const count = document.querySelector("#listCount");
const message = document.querySelector("#listMessage");
const adminForm = document.querySelector("#adminForm");
const adminPassword = document.querySelector("#adminPassword");
const adminButton = document.querySelector("#adminButton");
const listContent = document.querySelector("#listContent");
const copyButton = document.querySelector("#copyButton");
const logoutButton = document.querySelector("#logoutButton");
let currentRows = [];
let currentPassword = window.sessionStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) || "";

function hasSupabaseConfig() {
  return Boolean(
    SUPABASE_CONFIG.url
      && SUPABASE_CONFIG.anonKey
      && SUPABASE_CONFIG.anonKey !== SUPABASE_PLACEHOLDER_KEY,
  );
}

function getSupabaseHeaders() {
  return {
    apikey: SUPABASE_CONFIG.anonKey,
    Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
    "Content-Type": "application/json",
  };
}

async function callAdminFunction(name, payload) {
  const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: getSupabaseHeaders(),
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    if (response.status === 204) return null;
    return response.json();
  }

  let details = {};
  try {
    details = await response.json();
  } catch {
    details = {};
  }

  const error = new Error(details.message || "Admin request failed");
  error.details = details;
  throw error;
}

function renderRows(rows) {
  currentRows = rows;
  list.replaceChildren();

  rows.forEach((row) => {
    const item = document.createElement("li");

    const name = document.createElement("span");
    name.textContent = row.name;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-rsvp";
    deleteButton.type = "button";
    deleteButton.dataset.id = row.id;
    deleteButton.setAttribute("aria-label", `Remover ${row.name}`);
    deleteButton.textContent = "Excluir";

    item.append(name, deleteButton);
    list.append(item);
  });

  count.textContent = `${rows.length} ${rows.length === 1 ? "pessoa" : "pessoas"}`;
  copyButton.disabled = rows.length === 0;
  message.textContent = rows.length ? "" : "Ninguém confirmou ainda.";
}

function showLocked(messageText = "") {
  currentPassword = "";
  window.sessionStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
  adminPassword.value = "";
  adminForm.hidden = false;
  listContent.hidden = true;
  list.replaceChildren();
  count.textContent = "";
  copyButton.disabled = true;
  message.textContent = messageText;
}

function showUnlocked() {
  adminForm.hidden = true;
  listContent.hidden = false;
  message.textContent = "";
}

async function loadRsvps(password) {
  if (!hasSupabaseConfig()) {
    count.textContent = "Configuração pendente";
    message.textContent = "Adicione a anon key em supabase-config.js.";
    return;
  }

  const rows = await callAdminFunction("admin_list_rsvps", {
    admin_password: password,
  });
  renderRows(rows);
}

async function unlockList(password) {
  adminButton.disabled = true;
  message.textContent = "";

  try {
    await loadRsvps(password);
    currentPassword = password;
    window.sessionStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, password);
    showUnlocked();
  } catch {
    showLocked("Senha incorreta.");
    adminPassword.focus({ preventScroll: true });
  } finally {
    adminButton.disabled = false;
  }
}

async function deleteRsvp(id) {
  await callAdminFunction("admin_delete_rsvp", {
    admin_password: currentPassword,
    rsvp_id: id,
  });
}

async function copyNames() {
  const names = currentRows.map((row) => row.name).join("\n");
  if (!names) return;

  try {
    await window.navigator.clipboard.writeText(names);
    message.textContent = "Nomes copiados!";
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = names;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-999px";
    document.body.append(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
      message.textContent = "Nomes copiados!";
    } catch {
      message.textContent = "Não consegui copiar os nomes.";
    } finally {
      textarea.remove();
    }
  }
}

adminForm.addEventListener("submit", (event) => {
  event.preventDefault();
  unlockList(adminPassword.value);
});

copyButton.addEventListener("click", copyNames);

logoutButton.addEventListener("click", () => {
  showLocked();
  adminPassword.focus({ preventScroll: true });
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest(".delete-rsvp");
  if (!button) return;

  const row = currentRows.find((item) => item.id === button.dataset.id);
  if (!row) return;

  button.disabled = true;
  message.textContent = "";

  try {
    await deleteRsvp(row.id);
    renderRows(currentRows.filter((item) => item.id !== row.id));
  } catch {
    button.disabled = false;
    message.textContent = "Não consegui excluir esse nome.";
  }
});

if (currentPassword) {
  unlockList(currentPassword);
} else {
  showLocked();
}
