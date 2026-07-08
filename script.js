const stage = document.querySelector("#answerStage");
const noRunner = document.querySelector("#noRunner");
const noButton = document.querySelector("#noButton");
const yesButton = document.querySelector("#yesButton");
const hint = document.querySelector("#hint");
const successScene = document.querySelector("#successScene");
const closeSuccess = document.querySelector("#closeSuccess");
const danceShortcut = document.querySelector("#danceShortcut");

const messages = [
  "O gato roubou o não.",
  "Não vale fugir do parabéns.",
  "Quase, mas ele sambou pra longe.",
  "Acho que só sobrou o SIM!",
  "O gato vetou essa resposta.",
];

let escapes = 0;
let moving = false;
let lastPosition = { x: 20, y: 108 };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getSafePosition() {
  const stageRect = stage.getBoundingClientRect();
  const runnerRect = noRunner.getBoundingClientRect();
  const maxX = Math.max(0, stageRect.width - runnerRect.width);
  const maxY = Math.max(0, stageRect.height - runnerRect.height);

  let candidate = lastPosition;
  let attempts = 0;

  do {
    const minY = Math.min(108, maxY);
    candidate = {
      x: Math.round(Math.random() * maxX),
      y: Math.round(minY + Math.random() * Math.max(0, maxY - minY)),
    };
    attempts += 1;
  } while (Math.hypot(candidate.x - lastPosition.x, candidate.y - lastPosition.y) < 42 && attempts < 12);

  lastPosition = candidate;
  return candidate;
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
  hint.textContent = messages[Math.min(escapes - 1, messages.length - 1)];
  hint.classList.add("visible");

  window.setTimeout(() => {
    noRunner.classList.remove("travelling");
    moving = false;
  }, 660);
}

function showSuccess() {
  successScene.hidden = false;
  document.body.style.overflow = "hidden";
  successScene.dispatchEvent(new CustomEvent("dance:start"));
  closeSuccess.focus({ preventScroll: true });
}

function hideSuccess() {
  successScene.hidden = true;
  document.body.style.overflow = "";
  successScene.dispatchEvent(new CustomEvent("dance:stop"));
  yesButton.focus({ preventScroll: true });
}

function clampRunnerToStage() {
  const stageRect = stage.getBoundingClientRect();
  const runnerRect = noRunner.getBoundingClientRect();
  lastPosition = {
    x: clamp(lastPosition.x, 0, Math.max(0, stageRect.width - runnerRect.width)),
    y: clamp(lastPosition.y, 0, Math.max(0, stageRect.height - runnerRect.height)),
  };
  noRunner.style.left = `${lastPosition.x}px`;
  noRunner.style.top = `${lastPosition.y}px`;
}

noButton.addEventListener("click", moveNoButton);
noButton.addEventListener("pointerenter", (event) => {
  if (event.pointerType !== "touch") moveNoButton(event);
});

yesButton.addEventListener("click", showSuccess);
danceShortcut.addEventListener("click", showSuccess);
closeSuccess.addEventListener("click", hideSuccess);

successScene.addEventListener("click", (event) => {
  if (event.target === successScene) hideSuccess();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !successScene.hidden) hideSuccess();
});

window.addEventListener("resize", clampRunnerToStage);
window.addEventListener("orientationchange", () => window.setTimeout(clampRunnerToStage, 220));
