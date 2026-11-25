import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const CONTROL = "/partner-stub/__control";

const sourceSelect = (page: Page) =>
  page.getByRole("combobox", { name: "Источник слов" });
const wordInput = (page: Page) =>
  page.getByRole("textbox", { name: "Введите слово" });
const queueItems = (page: Page) =>
  page.getByRole("list", { name: "Слова в очереди" }).getByRole("listitem");
const foundList = (page: Page) =>
  page.getByRole("list", { name: "Найденные слова" });
const statItem = (page: Page, label: string) =>
  page.getByRole("list", { name: "Статистика" }).getByRole("listitem").filter({
    hasText: label,
  });

test.beforeEach(async ({ request }) => {
  await request.get(`${CONTROL}?reset`);
});

test("главный сценарий: ввод слов, очки, ошибки, конец игры и новая партия", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Словоловка" })).toBeVisible();
  await expect(queueItems(page)).toHaveCount(2);

  const word = (await queueItems(page).first().textContent()) ?? "";
  await wordInput(page).fill(word);
  await wordInput(page).press("Enter");
  await expect(statItem(page, "Счёт")).toHaveText(`Счёт ${word.length}`);
  await expect(queueItems(page).filter({ hasText: word })).toHaveCount(0);

  for (let i = 0; i < 5; i++) {
    await wordInput(page).fill("нетслова");
    await wordInput(page).press("Enter");
  }
  await expect(page.getByRole("status")).toContainText("Игра окончена");
  await expect(statItem(page, "Ошибки")).toHaveText("Ошибки 5/5");
  await expect(page.getByRole("button", { name: "Ввести" })).toBeDisabled();

  await page.getByRole("button", { name: "Новая игра" }).click();
  await expect(page.getByRole("status")).toContainText("Печатайте слово");
  await expect(statItem(page, "Ошибки")).toHaveText("Ошибки 0/5");
  await expect(statItem(page, "Рекорд")).toHaveText(`Рекорд ${word.length}`);
});

test("слова партнёра загружаются в ответ на выбор буквы", async ({ page }) => {
  await page.goto("/");
  await sourceSelect(page).selectOption("п");

  await expect(page.getByText("Найдено слов: 10")).toBeVisible();
  await expect(foundList(page).getByRole("listitem").first()).toHaveText(
    "пальма"
  );
});

test("если у партнёра ничего нет, игрок видит сообщение", async ({ page }) => {
  await page.goto("/");
  await sourceSelect(page).selectOption("ы");

  await expect(page.getByText(/Ничего не найдено/)).toBeVisible();
  await expect(queueItems(page)).toHaveCount(2);
});

test("ошибка сервера показывается, «Повторить» загружает слова", async ({
  page,
  request,
}) => {
  await request.get(`${CONTROL}?status=500`);
  await page.goto("/");
  await sourceSelect(page).selectOption("к");
  await expect(page.getByRole("alert")).toContainText("500");
  await expect(queueItems(page)).toHaveCount(2);

  await request.get(`${CONTROL}?status=200`);
  await page.getByRole("button", { name: "Повторить" }).click();
  await expect(page.getByText("Найдено слов: 13")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("медленный ответ: сначала видна загрузка, потом слова", async ({
  page,
  request,
}) => {
  await request.get(`${CONTROL}?delay=1000`);
  await page.goto("/");
  await sourceSelect(page).selectOption("к");

  await expect(page.getByText("Загружаем слова…")).toBeVisible();
  await expect(page.getByText("Найдено слов: 13")).toBeVisible();
  await expect(page.getByText("Загружаем слова…")).toHaveCount(0);
});

test("быстро меняю фильтр: медленный ответ на прошлый выбор не затирает текущий", async ({
  page,
}) => {
  let releaseSlow = (): void => undefined;
  const slowGate = new Promise<void>((resolve) => {
    releaseSlow = resolve;
  });
  await page.route("**/w/api.php*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("pssearch") === "к") await slowGate;
    await route.continue().catch(() => undefined);
  });
  await page.goto("/");

  await sourceSelect(page).selectOption("к");
  await sourceSelect(page).selectOption("п");
  await expect(page.getByText("Найдено слов: 10")).toBeVisible();

  releaseSlow();
  await page.waitForTimeout(300);

  await expect(sourceSelect(page)).toHaveValue("п");
  await expect(page.getByText("Найдено слов: 10")).toBeVisible();
  await expect(foundList(page).getByRole("listitem").first()).toHaveText(
    "пальма"
  );
  await expect(foundList(page).getByText("кошка")).toHaveCount(0);
});

test("тема и источник слов сохраняются между запусками", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Тёмная тема" }).click();
  await sourceSelect(page).selectOption("с");
  await expect(page.getByText(/Найдено слов/)).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("button", { name: "Тёмная тема" })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(sourceSelect(page)).toHaveValue("с");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("при закрытии страницы сохраняется точное положение шарика", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForTimeout(400);

  const saved = await page.evaluate(() => {
    const ball = document.getElementById("ball");
    const field = document.getElementById("game-area");
    if (!ball || !field) throw new Error("Нет поля игры");
    window.dispatchEvent(new Event("pagehide"));
    const state = JSON.parse(
      window.localStorage.getItem("word_catcher_save_v2") ?? "{}"
    ) as { position: number };
    const free = field.clientWidth - ball.offsetWidth;
    return {
      fromSave: (state.position / 600) * free,
      onScreen: ball.offsetLeft,
    };
  });

  expect(saved.fromSave).toBeGreaterThan(0);
  expect(Math.abs(saved.fromSave - saved.onScreen)).toBeLessThan(1.5);
});

test("прогресс переживает перезагрузку страницы", async ({ page }) => {
  await page.goto("/");
  const word = (await queueItems(page).first().textContent()) ?? "";
  await wordInput(page).fill(word);
  await wordInput(page).press("Enter");
  await expect(statItem(page, "Счёт")).toHaveText(`Счёт ${word.length}`);

  await page.reload();

  await expect(statItem(page, "Счёт")).toHaveText(`Счёт ${word.length}`);
});
