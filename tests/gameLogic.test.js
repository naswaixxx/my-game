import assert from "node:assert";
import { test } from "node:test";
import {
  createGameState,
  addItem,
  removeItem,
  updatePosition,
  parseSaveData,
} from "../src/gameLogic.js";

test("Правило 1: Корректное добавление нового элемента в список", () => {
  const initial = createGameState();
  const updated = addItem(initial, "Новая цель");
  assert.strictEqual(updated.items.length, 1);
  assert.strictEqual(updated.items[0].text, "Новая цель");
  assert.strictEqual(initial.items.length, 0, "исходное состояние не меняется");
});

test("Правило 2: Пустой и пробельный ввод не добавляется", () => {
  const initial = createGameState();
  assert.strictEqual(addItem(initial, ""), initial);
  assert.strictEqual(addItem(initial, "   "), initial);
  assert.strictEqual(addItem(initial, null), initial);
});

test("Правило 3: За каждую цель начисляется 10 очков, id не повторяются", () => {
  let state = createGameState();
  state = addItem(state, "A");
  state = addItem(state, "B");
  assert.strictEqual(state.score, 20);
  assert.notStrictEqual(state.items[0].id, state.items[1].id);
});

test("Правило 4: Корректное удаление элемента из списка по ID", () => {
  const initial = createGameState({
    items: [{ id: 100, text: "Удалить меня" }],
  });
  const updated = removeItem(initial, 100);
  assert.strictEqual(updated.items.length, 0);
});

test("Правило 5: Движение рассчитывается одинаково независимо от deltaTime (delta cap)", () => {
  const initial = createGameState({ position: 0, speed: 100 });
  const step = updatePosition(initial, 0.05, 500);
  assert.strictEqual(step.position, 5);

  const tabSwitchStep = updatePosition(initial, 2.5, 500);
  assert.strictEqual(tabSwitchStep.position, 10);
});

test("Правило 6: За секунду шарик проходит одно расстояние на 60 и 144 Гц", () => {
  const run = (hz) => {
    let state = createGameState({ position: 0, speed: 100 });
    for (let i = 0; i < hz; i++) state = updatePosition(state, 1 / hz, 500);
    return state.position;
  };
  assert.ok(Math.abs(run(60) - run(144)) < 1e-6);
});

test("Правило 7: У границы шарик разворачивается", () => {
  const atEdge = createGameState({ position: 499, speed: 100 });
  const bounced = updatePosition(atEdge, 0.05, 500);
  assert.strictEqual(bounced.position, 500);
  assert.ok(bounced.speed < 0);
});

test("Правило 8: Повреждённое сохранение сбрасывается к начальному состоянию", () => {
  const corrupted = [
    "{ invalid_json: true, ",
    "",
    null,
    undefined,
    "null",
    "42",
    '{"score":"много","items":[]}',
    '{"score":5,"items":"нет"}',
    '{"score":5,"items":[1,null,{"id":"x"}]}',
  ];
  for (const save of corrupted) {
    const result = parseSaveData(save);
    assert.strictEqual(result.score, 0);
    assert.deepStrictEqual(result.items, []);
  }
});

test("Правило 9: Корректное сохранение восстанавливается полностью", () => {
  const saved = createGameState({
    score: 30,
    items: [{ id: 1, text: "Цель" }],
    position: 123,
    speed: -100,
  });
  const restored = parseSaveData(JSON.stringify(saved));
  assert.deepStrictEqual(restored, saved);
});
