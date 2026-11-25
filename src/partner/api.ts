import { isPlayableWord, normalizeWord } from "../gameLogic.ts";

const WORDS_LIMIT = 100;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function extractTitles(data: unknown): string[] | null {
  if (!isRecord(data) || !("batchcomplete" in data)) return null;
  if (!("query" in data)) return [];
  const { query } = data;
  if (!isRecord(query)) return null;
  const found = query["prefixsearch"];
  if (!Array.isArray(found)) return null;
  const titles: string[] = [];
  for (const item of found) {
    if (!isRecord(item) || typeof item["title"] !== "string") return null;
    titles.push(item["title"]);
  }
  return titles;
}

function toWords(titles: readonly string[]): string[] {
  return [...new Set(titles.map(normalizeWord))].filter(isPlayableWord);
}

export function buildUrl(baseUrl: string, letter: string): string {
  const params = new URLSearchParams({
    action: "query",
    list: "prefixsearch",
    pssearch: letter,
    psnamespace: "0",
    pslimit: String(WORDS_LIMIT),
    format: "json",
    formatversion: "2",
    origin: "*",
  });
  return `${baseUrl}/w/api.php?${params.toString()}`;
}

export async function loadWords(
  letter: string,
  signal: AbortSignal,
  baseUrl: string = import.meta.env.VITE_API_URL
): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch(buildUrl(baseUrl, letter), { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("нет соединения с сервером слов");
  }
  if (!response.ok) {
    throw new Error(`сервер слов вернул ошибку ${response.status}`);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("сервер слов вернул неверный ответ");
  }
  const titles = extractTitles(data);
  if (titles === null) throw new Error("сервер слов вернул неожиданные данные");
  return toWords(titles);
}
