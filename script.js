const stage = document.querySelector("#answerStage");
const noRunner = document.querySelector("#noRunner");
const noButton = document.querySelector("#noButton");
const yesButton = document.querySelector("#yesButton");
const hint = document.querySelector("#hint");
const success = document.querySelector("#success");
const closeSuccess = document.querySelector("#closeSuccess");

let escapes = 0;
let moving = false;
let lastPosition = null;

const messages = [
  "O gato discorda dessa escolha.",
  "Quase! Mas o gato foi mais rápido.",
  "Ele levou o “não” para bem longe.",
  "Acho que só sobrou uma opção…",
  "O gato está levando isso para o lado pessoal.",
];

function getSafePosition() {
  const stageRect = stage.getBoundingClientRect();
  const runnerRect = noRunner.getBoundingClientRect();
  const maxX = Math.max(0, stageRect.width - runnerRect.width);
  const maxY = Math.max(0, stageRect.height - runnerRect.height);

  let candidate;
  let attempts = 0;

  do {
    candidate = {
      x: Math.round(Math.random() * maxX),
      y: Math.round(56 + Math.random() * Math.max(0, maxY - 56)),
    };
    attempts += 1;
  } while (
    lastPosition &&
    Math.hypot(candidate.x - lastPosition.x, candidate.y - lastPosition.y) < 100 &&
    attempts < 12
  );

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

  window.setTimeout(() => {
    noRunner.classList.remove("travelling");
    moving = false;
  }, 640);
}

function showSuccess() {
  success.hidden = false;
  document.body.style.overflow = "hidden";
  closeSuccess.focus();
}

function hideSuccess() {
  success.hidden = true;
  document.body.style.overflow = "";
  yesButton.focus();
}

noButton.addEventListener("click", moveNoButton);

noRunner.addEventListener("mouseenter", (event) => {
  if (event.pointerType !== "touch") moveNoButton(event);
});

yesButton.addEventListener("click", showSuccess);
closeSuccess.addEventListener("click", hideSuccess);

success.addEventListener("click", (event) => {
  if (event.target === success) hideSuccess();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !success.hidden) hideSuccess();
});

window.addEventListener("resize", () => {
  if (!lastPosition) return;
  const stageRect = stage.getBoundingClientRect();
  const runnerRect = noRunner.getBoundingClientRect();
  const x = Math.min(lastPosition.x, stageRect.width - runnerRect.width);
  const y = Math.min(lastPosition.y, stageRect.height - runnerRect.height);
  lastPosition = { x: Math.max(0, x), y: Math.max(0, y) };
  noRunner.style.left = `${lastPosition.x}px`;
  noRunner.style.top = `${lastPosition.y}px`;
});
