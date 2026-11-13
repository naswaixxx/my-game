import confetti from "canvas-confetti";
import "./style.css";
import {
  MAX_MISSES,
  MAX_WORDS,
  advance,
  createGame,
  getLevel,
  getSpeed,
  parseBall,
  parseSave,
  submitWord,
} from "./gameLogic.js";

const SAVE_KEY = "word_catcher_save_v1";
const BALL_KEY = "word_catcher_ball_v1";

const messageEl = document.getElementById("message");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const levelEl = document.getElementById("level");
const speedEl = document.getElementById("speed");
const queueEl = document.getElementById("queue");
const missesEl = document.getElementById("misses");
const gameAreaEl = document.getElementById("game-area");
const ballEl = document.getElementById("ball");
const wordsEl = document.getElementById("words");
const inputEl = document.getElementById("word-input");
const submitBtn = document.getElementById("submit-btn");
const restartBtn = document.getElementById("restart-btn");

function readStored(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

const saved = parseSave(readStored(localStorage, SAVE_KEY));
const ball = parseBall(readStored(sessionStorage, BALL_KEY));
let state = saved ? { ...saved, ...ball } : createGame();
writeStored(localStorage, SAVE_KEY, state);
let draft = "";
let needsFocus = false;

inputEl.addEventListener("input", () => {
  draft = inputEl.value;
});

function submit() {
  const next = submitWord(state, draft);
  if (next === state) return;
  state = next;
  draft = "";
  needsFocus = true;
  writeStored(localStorage, SAVE_KEY, state);
}

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submit();
});

submitBtn.addEventListener("click", submit);

restartBtn.addEventListener("click", () => {
  state = createGame(state.best);
  draft = "";
  needsFocus = true;
  writeStored(localStorage, SAVE_KEY, state);
});

let lastTime = null;
let shownItems = null;
let shownLevel = getLevel(state);
let shownMisses = state.misses;

document.addEventListener("visibilitychange", () => {
  lastTime = null;
});

window.addEventListener("pagehide", () => {
  const { position, direction } = state;
  writeStored(sessionStorage, BALL_KEY, { position, direction });
});

function setText(element, value) {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
}

function renderWords() {
  if (state.items !== shownItems) {
    shownItems = state.items;
    wordsEl.replaceChildren(
      ...state.items.map((word) => {
        const li = document.createElement("li");
        li.textContent = word;
        return li;
      })
    );
  }
  const prefix = draft.trim().toLowerCase();
  for (const li of wordsEl.children) {
    li.classList.toggle(
      "match",
      prefix !== "" && li.textContent.startsWith(prefix)
    );
  }
}

function renderStats() {
  setText(scoreEl, state.score);
  setText(bestEl, state.best);
  setText(levelEl, getLevel(state));
  setText(speedEl, getSpeed(state));
  setText(queueEl, `${state.items.length}/${MAX_WORDS}`);
  setText(missesEl, `${state.misses}/${MAX_MISSES}`);
  setText(
    messageEl,
    state.status === "over"
      ? "Игра окончена. Нажмите «Новая игра»"
      : "Печатайте слово из списка и нажимайте Enter"
  );
}

function renderControls() {
  const over = state.status === "over";
  gameAreaEl.classList.toggle("over", over);
  inputEl.disabled = over;
  submitBtn.disabled = over;
  if (inputEl.value !== draft) inputEl.value = draft;
  if (needsFocus && !over) {
    needsFocus = false;
    inputEl.focus();
  }
}

function renderEffects() {
  const level = getLevel(state);
  if (level > shownLevel) {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
  }
  shownLevel = level;

  if (state.misses > shownMisses) {
    inputEl.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 200 }
    );
  }
  shownMisses = state.misses;
}

function frame(time) {
  const dt = lastTime === null ? 0 : (time - lastTime) / 1000;
  lastTime = time;

  const next = advance(state, dt, gameAreaEl.clientWidth - ballEl.offsetWidth);
  if (next.items !== state.items || next.status !== state.status) {
    writeStored(localStorage, SAVE_KEY, next);
  }
  state = next;

  renderWords();
  renderStats();
  renderControls();
  renderEffects();
  ballEl.style.transform = `translateX(${state.position}px)`;

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
