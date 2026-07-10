const screens = {
  invite: document.querySelector("#inviteScreen"),
  name: document.querySelector("#nameScreen"),
  dance: document.querySelector("#danceScreen"),
};

const stage = document.querySelector("#answerStage");
const noRunner = document.querySelector("#noRunner");
const noButton = document.querySelector("#noButton");
const yesButton = document.querySelector("#yesButton");
const danceShortcut = document.querySelector("#danceShortcut");
const nameForm = document.querySelector("#nameForm");
const guestName = document.querySelector("#guestName");
const okButton = document.querySelector("#okButton");
const seeYouText = document.querySelector("#seeYouText");
const heheButton = document.querySelector("#heheButton");
const danceScreen = document.querySelector("#danceScreen");
const app = document.querySelector(".invite-app");

const STORAGE_KEY = "niver-marcelo-rsvp-names";

let escapes = 0;
let moving = false;
let lastPosition = { x: 0, y: 108 };

function fitAppToViewport() {
  app.style.setProperty("--app-width", "100vw");
  app.style.setProperty("--app-height", "100svh");
}

function showScreen(name) {
  Object.entries(screens).forEach(([screenName, screen]) => {
    const active = screenName === name;
    screen.hidden = !active;
    screen.classList.toggle("is-active", active);
  });

  if (name === "dance") {
    danceScreen.dispatchEvent(new CustomEvent("dance:start"));
  } else {
    danceScreen.dispatchEvent(new CustomEvent("dance:stop"));
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getSafePosition() {
  const screenWidth = screens.invite.offsetWidth;
  const screenHeight = screens.invite.offsetHeight;
  const buttonHeight = noRunner.offsetHeight;
  const minDistance = buttonHeight * 2;
  const minX = -stage.offsetLeft;
  const maxX = Math.max(minX, screenWidth - stage.offsetLeft - noRunner.offsetWidth);
  const minY = -stage.offsetTop;
  const maxY = Math.max(minY, screenHeight - stage.offsetTop - buttonHeight);

  let candidate = lastPosition;
  let bestCandidate = lastPosition;
  let bestDistance = 0;
  let attempts = 0;

  do {
    candidate = {
      x: Math.round(minX + Math.random() * (maxX - minX)),
      y: Math.round(minY + Math.random() * (maxY - minY)),
    };
    const distance = Math.hypot(candidate.x - lastPosition.x, candidate.y - lastPosition.y);
    if (distance > bestDistance) {
      bestCandidate = candidate;
      bestDistance = distance;
    }
    attempts += 1;
  } while (Math.hypot(candidate.x - lastPosition.x, candidate.y - lastPosition.y) < minDistance && attempts < 24);

  lastPosition = bestDistance >= minDistance ? candidate : bestCandidate;
  return lastPosition;
}

function moveNoButton(event) {
  event?.preventDefault();

  if (moving) return;
  moving = true;
  escapes += 1;

  const next = getSafePosition();
  noRunner.classList.add("travelling");
  noRunner.style.left = `${next.x}px`;
  noRunner.style.top = `${next.y}px`;

  window.setTimeout(() => {
    noRunner.classList.remove("travelling");
    moving = false;
  }, 660);
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function updateOkState() {
  okButton.disabled = normalizeName(guestName.value).length === 0;
}

function storeName(name) {
  const existing = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
  existing.push({
    name,
    answeredAt: new Date().toISOString(),
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

function goToDance(mode = "confirmed") {
  const shortcut = mode === "shortcut";
  seeYouText.hidden = shortcut;
  heheButton.hidden = !shortcut;
  showScreen("dance");
}

function clampRunnerToStage() {
  const screenWidth = screens.invite.offsetWidth;
  const screenHeight = screens.invite.offsetHeight;
  const minX = -stage.offsetLeft;
  const maxX = Math.max(minX, screenWidth - stage.offsetLeft - noRunner.offsetWidth);
  const minY = -stage.offsetTop;
  const maxY = Math.max(minY, screenHeight - stage.offsetTop - noRunner.offsetHeight);
  lastPosition = {
    x: clamp(lastPosition.x, minX, maxX),
    y: clamp(lastPosition.y, minY, maxY),
  };
  noRunner.style.left = `${lastPosition.x}px`;
  noRunner.style.top = `${lastPosition.y}px`;
}

noButton.addEventListener("click", moveNoButton);
noButton.addEventListener("pointerenter", (event) => {
  if (event.pointerType !== "touch") moveNoButton(event);
});

yesButton.addEventListener("click", () => {
  showScreen("name");
  window.setTimeout(() => guestName.focus({ preventScroll: true }), 180);
});

danceShortcut.addEventListener("click", () => goToDance("shortcut"));

guestName.addEventListener("input", () => {
  guestName.value = guestName.value.toLocaleUpperCase("pt-BR");
  updateOkState();
});

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = normalizeName(guestName.value);
  if (!name) {
    updateOkState();
    guestName.focus({ preventScroll: true });
    return;
  }

  storeName(name);
  goToDance("confirmed");
});

heheButton.addEventListener("click", () => {
  showScreen("invite");
  yesButton.focus({ preventScroll: true });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !screens.invite.hidden) return;
  if (event.key === "Escape") {
    showScreen("invite");
    yesButton.focus({ preventScroll: true });
  }
});

window.addEventListener("resize", () => {
  fitAppToViewport();
  clampRunnerToStage();
});
window.addEventListener("orientationchange", () => {
  window.setTimeout(() => {
    fitAppToViewport();
    clampRunnerToStage();
  }, 220);
});
fitAppToViewport();
updateOkState();
