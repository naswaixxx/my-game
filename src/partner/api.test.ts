import { afterEach, describe, expect, test, vi } from "vitest";
import { buildUrl, loadWords } from "./api.ts";

const signal = new AbortController().signal;

const reply = (titles: readonly string[]): Response =>
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

const stubFetch = (response: () => Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>(() => response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("запрос к партнёру", () => {
  test("адрес строится из настройки окружения и буквы игрока", () => {
    const url = new URL(buildUrl("https://example.test", "к"));
    expect(url.origin).toBe("https://example.test");
    expect(url.pathname).toBe("/w/api.php");
    expect(url.searchParams.get("list")).toBe("prefixsearch");
    expect(url.searchParams.get("pssearch")).toBe("к");
    expect(url.searchParams.get("origin")).toBe("*");
  });

  test("запрос уходит по заданному адресу вместе с signal для отмены", async () => {
    const fetchMock = stubFetch(async () => reply([]));
    await loadWords("п", signal, "https://example.test");
    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toBe(buildUrl("https://example.test", "п"));
    expect(call?.[1]).toEqual({ signal });
  });
});

describe("разбор ответа", () => {
  test("названия превращаются в слова для игры", async () => {
    stubFetch(async () => reply(["Кошка", "Корабль", "Кит"]));
    expect(await loadWords("к", signal, "")).toEqual([
      "кошка",
      "корабль",
      "кит",
    ]);
  });

  test("составные названия, латиница, короткие и слишком длинные отбрасываются", async () => {
    stubFetch(async () =>
      reply([
        "Красная площадь",
        "Кошка (значения)",
        "Kotlin",
        "Ко",
        "К2",
        "Кабан",
        "Необычайнодлинноеслововтитуле",
      ])
    );
    expect(await loadWords("к", signal, "")).toEqual(["кабан"]);
  });

  test("повторы убираются", async () => {
    stubFetch(async () => reply(["Кошка", "кошка", "КОШКА"]));
    expect(await loadWords("к", signal, "")).toEqual(["кошка"]);
  });

  test("пустой результат — это пустой список, а не ошибка", async () => {
    stubFetch(async () => reply([]));
    expect(await loadWords("ы", signal, "")).toEqual([]);
    stubFetch(
      async () => new Response(JSON.stringify({ batchcomplete: true }))
    );
    expect(await loadWords("ы", signal, "")).toEqual([]);
  });
});

describe("ошибки загрузки", () => {
  test("ответ с кодом 500 — ошибка с кодом", async () => {
    stubFetch(async () => new Response("", { status: 500 }));
    await expect(loadWords("к", signal, "")).rejects.toThrow("500");
  });

  test("сетевой сбой — понятная ошибка", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(loadWords("к", signal, "")).rejects.toThrow("нет соединения");
  });

  test("ответ не в формате JSON — ошибка", async () => {
    stubFetch(async () => new Response("<html>Bad gateway</html>"));
    await expect(loadWords("к", signal, "")).rejects.toThrow("неверный ответ");
  });

  test("неожиданная форма данных — ошибка", async () => {
    const wrong: unknown[] = [
      null,
      [],
      "строка",
      {},
      { error: { code: "x", info: "y" } },
      { batchcomplete: true, query: null },
      { batchcomplete: true, query: { prefixsearch: "нет" } },
      { batchcomplete: true, query: { prefixsearch: [1] } },
      { batchcomplete: true, query: { prefixsearch: [{ title: 5 }] } },
    ];
    for (const body of wrong) {
      stubFetch(async () => new Response(JSON.stringify(body)));
      await expect(
        loadWords("к", signal, ""),
        JSON.stringify(body)
      ).rejects.toThrow("неожиданные данные");
    }
  });

  test("отмена запроса не превращается в ошибку для пользователя", async () => {
    const controller = new AbortController();
    stubFetch(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });
    await expect(loadWords("к", controller.signal, "")).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
