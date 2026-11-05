import confetti from "canvas-confetti";
import "./style.css";
import {
  createGameState,
  addItem,
  removeItem,
  updatePosition,
  parseSaveData,
} from "./gameLogic.js";

const STORAGE_KEY = "my_game_save_v1";
const SAVE_INTERVAL_MS = 1000;

const inputEl = document.getElementById("player-input");
const addBtn = document.getElementById("add-btn");
const resetBtn = document.getElementById("reset-btn");
const listEl = document.getElementById("items-list");
const scoreDisplay = document.getElementById("score-display");
const speedDisplay = document.getElementById("speed-display");
const gameAreaEl = document.getElementById("game-area");
const targetEl = document.getElementById("moving-target");

function readSave() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Последнее значение, которое игра сама записала (или прочитала при старте).
// Если сохранение изменили снаружи (например, испортили в DevTools),
// игра его не затирает: после перезагрузки начнётся новая игра.
let lastKnownSave = readSave();

function writeSave(state) {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== lastKnownSave) return;
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, json);
    lastKnownSave = json;
  } catch {
    // Хранилище недоступно (приватный режим, квота): играем без сохранения
  }
}

function clearSave() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    lastKnownSave = null;
  } catch {
    // см. выше
  }
}

let state = parseSaveData(lastKnownSave);

// Обработчики событий только меняют состояние и ставят флаги.
// Всё, что трогает DOM (список, поле ввода, конфетти), делает applyToDom
// в игровом цикле.
const pending = {
  renderList: true,
  clearInput: null,
  confetti: false,
};

addBtn.addEventListener("click", submitItem);
inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitItem();
});

function submitItem() {
  const next = addItem(state, inputEl.value);
  if (next === state) return;
  state = next;
  pending.renderList = true;
  pending.clearInput = inputEl.value;
  pending.confetti = true;
}

listEl.addEventListener("click", (event) => {
  const id = Number(event.target.dataset?.removeId);
  if (!Number.isFinite(id)) return;
  state = removeItem(state, id);
  pending.renderList = true;
});

resetBtn.addEventListener("click", () => {
  clearSave();
  state = createGameState();
  pending.renderList = true;
});

let lastFrameTime = null;
let lastSaveTime = 0;

// После возврата на вкладку время кадра считаем заново, чтобы не было рывка.
document.addEventListener("visibilitychange", () => {
  lastFrameTime = null;
  if (document.visibilityState === "hidden") writeSave(state);
});
window.addEventListener("pagehide", () => writeSave(state));

function renderList() {
  listEl.replaceChildren(
    ...state.items.map((item) => {
      const li = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = item.text;
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Удалить";
      deleteBtn.dataset.removeId = item.id;
      li.append(label, deleteBtn);
      return li;
    })
  );
}

function applyToDom() {
  if (pending.renderList) {
    pending.renderList = false;
    renderList();
  }
  if (pending.clearInput !== null) {
    // Очищаем поле, только если пользователь уже не начал вводить новый текст
    if (inputEl.value === pending.clearInput) inputEl.value = "";
    pending.clearInput = null;
    inputEl.focus();
  }
  if (pending.confetti) {
    pending.confetti = false;
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
  }

  scoreDisplay.textContent = state.score;
  speedDisplay.textContent = Math.round(Math.abs(state.speed));
  targetEl.style.transform = `translateX(${state.position}px)`;
}

function gameLoop(currentTime) {
  const dt = lastFrameTime === null ? 0 : (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;

  const maxBounds = Math.max(gameAreaEl.clientWidth - targetEl.offsetWidth, 0);
  state = updatePosition(state, dt, maxBounds);
  applyToDom();

  if (currentTime - lastSaveTime >= SAVE_INTERVAL_MS) {
    lastSaveTime = currentTime;
    writeSave(state);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
