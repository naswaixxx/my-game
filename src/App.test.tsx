import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { App } from "./App.tsx";
import { Providers } from "./Providers.tsx";
import { useSettings } from "./settings/SettingsContext.tsx";
import { useGameSelector } from "./store/GameContext.tsx";

const SAVE_KEY = "word_catcher_save_v2";

const wikiReply = (titles: readonly string[]): Response =>
  new Response(
    JSON.stringify({
      batchcomplete: true,
      query: {
        prefixsearch: titles.map((title, index) => ({
          ns: 0,
          title,
          pageid: index + 1,
        })),
      },
    })
  );

const letterOf = (input: unknown): string =>
  new URL(String(input), "http://test.local").searchParams.get("pssearch") ??
  "";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function renderApp() {
  return render(
    <Providers>
      <App />
    </Providers>
  );
}

const sourceSelect = (): HTMLElement =>
  screen.getByRole("combobox", { name: "Источник слов" });

const wordInput = (): HTMLElement =>
  screen.getByRole("textbox", { name: "Введите слово" });

function queue(): string[] {
  const list = screen.getByRole("list", { name: "Слова в очереди" });
  return within(list)
    .queryAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

function foundWords(): string[] {
  const list = screen.getByRole("list", { name: "Найденные слова" });
  return within(list)
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

function stat(label: string): string {
  const list = screen.getByRole("list", { name: "Статистика" });
  const item = within(list)
    .getAllByRole("listitem")
    .find((li) => li.textContent?.startsWith(label));
  return (item?.textContent ?? "").slice(label.length).trim();
}

const readSavedGame = (): Record<string, unknown> =>
  JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? "{}") as Record<
    string,
    unknown
  >;

const savedGame = {
  status: "playing",
  score: 12,
  best: 30,
  typed: 3,
  misses: 1,
  items: ["исчезнувшее", "вымершее"],
  draft: "ис",
  position: 250,
  direction: -1,
};

describe("загрузка слов партнёра", () => {
  test("при выборе буквы показывается загрузка, затем найденные слова", async () => {
    const gate = deferred<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => gate.promise)
    );
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(sourceSelect(), "к");
    expect(screen.getByText("Загружаем слова…")).toBeInTheDocument();

    gate.resolve(wikiReply(["Кошка", "Корабль"]));
    expect(await screen.findByText("Найдено слов: 2")).toBeInTheDocument();
    expect(foundWords()).toEqual(["кошка", "корабль"]);
    expect(screen.queryByText("Загружаем слова…")).not.toBeInTheDocument();
  });

  test("после ошибки кнопка «Повторить» загружает слова без перезагрузки страницы", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(wikiReply(["Кошка"]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(sourceSelect(), "к");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось загрузить слова"
    );

    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByText("Найдено слов: 1")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("сетевой сбой и неожиданный ответ не роняют игру", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ hello: 1 })));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(sourceSelect(), "к");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "нет соединения"
    );
    expect(queue()).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "неожиданные данные"
    );
    expect(screen.getByRole("heading", { name: "Словоловка" })).toBeVisible();
    expect(queue()).toHaveLength(2);
  });

  test("если ничего не найдено, пользователь видит об этом сообщение", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => wikiReply([]))
    );
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(sourceSelect(), "ы");
    expect(await screen.findByText(/Ничего не найдено/)).toBeInTheDocument();
    expect(queue()).toHaveLength(2);
  });

  test("быстро меняю фильтр: на экране остаются слова для последнего выбора", async () => {
    const slow = deferred<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn((input: unknown) =>
        letterOf(input) === "к"
          ? slow.promise
          : Promise.resolve(wikiReply(["Пальма", "Панда"]))
      )
    );
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(sourceSelect(), "к");
    await user.selectOptions(sourceSelect(), "п");
    expect(await screen.findByText("Найдено слов: 2")).toBeInTheDocument();

    await act(async () => {
      slow.resolve(wikiReply(["Кошка", "Корабль", "Кит"]));
      await slow.promise;
    });

    expect(sourceSelect()).toHaveValue("п");
    expect(foundWords()).toEqual(["пальма", "панда"]);
    expect(screen.getByText("Найдено слов: 2")).toBeInTheDocument();
  });

  test("при новом запуске слова загружаются заново и берутся актуальные", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(wikiReply(["Кошка"]))
      .mockResolvedValueOnce(wikiReply(["Кошка", "Кит"]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const first = renderApp();

    await user.selectOptions(sourceSelect(), "к");
    expect(await screen.findByText("Найдено слов: 1")).toBeInTheDocument();
    first.unmount();

    renderApp();
    expect(sourceSelect()).toHaveValue("к");
    expect(await screen.findByText("Найдено слов: 2")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("игра", () => {
  test("слово из списка принимается: уходит из очереди и даёт очки", async () => {
    const user = userEvent.setup();
    renderApp();
    const [word = ""] = queue();

    await user.type(wordInput(), `${word}{Enter}`);

    expect(queue()).toHaveLength(1);
    expect(queue()).not.toContain(word);
    expect(stat("Счёт")).toBe(String(word.length));
    expect(stat("Очередь")).toBe("1/8");
    expect(wordInput()).toHaveValue("");
  });

  test("неправильное слово считается ошибкой и не меняет очередь", async () => {
    const user = userEvent.setup();
    renderApp();
    const before = queue();

    await user.type(wordInput(), "нетслова{Enter}");

    expect(stat("Ошибки")).toBe("1/5");
    expect(stat("Счёт")).toBe("0");
    expect(queue()).toEqual(before);
  });

  test("после пяти ошибок игра заканчивается, «Новая игра» начинает заново", async () => {
    const user = userEvent.setup();
    renderApp();

    for (let i = 0; i < 5; i++) {
      await user.type(wordInput(), "нетслова{Enter}");
    }

    expect(screen.getByRole("status")).toHaveTextContent("Игра окончена");
    expect(wordInput()).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Ввести" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Новая игра" }));

    expect(screen.getByRole("status")).toHaveTextContent("Печатайте слово");
    expect(stat("Ошибки")).toBe("0/5");
    expect(queue()).toHaveLength(2);
  });

  test("прогресс прошлого запуска восстанавливается, даже если слов больше нет у партнёра", async () => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(savedGame));
    const user = userEvent.setup();
    renderApp();

    expect(queue()).toEqual(["исчезнувшее", "вымершее"]);
    expect(stat("Счёт")).toBe("12");
    expect(stat("Рекорд")).toBe("30");
    expect(wordInput()).toHaveValue("ис");

    await user.type(wordInput(), "чезнувшее{Enter}");

    expect(queue()).toEqual(["вымершее"]);
    expect(stat("Счёт")).toBe("23");
  });

  test("повреждённое сохранение игнорируется и игра начинается заново", () => {
    window.localStorage.setItem(SAVE_KEY, '{"score":"много"}');
    renderApp();

    expect(queue()).toHaveLength(2);
    expect(stat("Счёт")).toBe("0");
  });
});

describe("сохранение положения шарика", () => {
  test("при закрытии страницы точное положение и направление шарика сохраняются", () => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(savedGame));
    renderApp();
    window.localStorage.clear();

    window.dispatchEvent(new Event("pagehide"));

    expect(readSavedGame()).toMatchObject({ position: 250, direction: -1 });
  });

  test("при сворачивании вкладки игра тоже сохраняется", () => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(savedGame));
    renderApp();
    window.localStorage.clear();
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });

    document.dispatchEvent(new Event("visibilitychange"));
    Reflect.deleteProperty(document, "visibilityState");

    expect(readSavedGame()).toMatchObject({ position: 250, direction: -1 });
  });

  test("после действия игрока сохраняются очки и очередь", async () => {
    const user = userEvent.setup();
    renderApp();
    const [word = ""] = queue();

    await user.type(wordInput(), `${word}{Enter}`);

    expect(readSavedGame()).toMatchObject({
      score: word.length,
      typed: 1,
    });
  });
});

describe("настройки и общие данные", () => {
  test("тёмная тема включается кнопкой и сохраняется между запусками", async () => {
    const user = userEvent.setup();
    const first = renderApp();
    const toggle = screen.getByRole("button", { name: "Тёмная тема" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    first.unmount();
    document.documentElement.removeAttribute("data-theme");

    renderApp();
    expect(screen.getByRole("button", { name: "Тёмная тема" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  test("выбранный источник слов сохраняется между запусками", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => wikiReply(["Кошка"]))
    );
    const user = userEvent.setup();
    const first = renderApp();

    await user.selectOptions(sourceSelect(), "к");
    first.unmount();

    renderApp();
    expect(sourceSelect()).toHaveValue("к");
    expect(await screen.findByText("Найдено слов: 1")).toBeInTheDocument();
  });

  test("новый компонент получает настройки и данные игры на любой глубине без props", async () => {
    function ThemeProbe() {
      const { settings } = useSettings();
      return <p>Тема сейчас: {settings.theme}</p>;
    }
    function ScoreProbe() {
      const score = useGameSelector((state) => state.score);
      return <p>Очки в глубине: {score}</p>;
    }
    const user = userEvent.setup();
    render(
      <Providers>
        <App />
        <div>
          <section>
            <div>
              <ThemeProbe />
              <ScoreProbe />
            </div>
          </section>
        </div>
      </Providers>
    );
    const [word = ""] = queue();
    expect(screen.getByText("Тема сейчас: light")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Тёмная тема" }));
    await user.type(wordInput(), `${word}{Enter}`);

    expect(screen.getByText("Тема сейчас: dark")).toBeInTheDocument();
    expect(
      screen.getByText(`Очки в глубине: ${word.length}`)
    ).toBeInTheDocument();
  });
});
