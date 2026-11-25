import type { ChangeEvent } from "react";
import { useWords } from "../partner/WordsContext.tsx";
import { useSettings } from "../settings/SettingsContext.tsx";
import { LETTERS, SOURCE_BUILTIN } from "../settings/settings.ts";

const PREVIEW_LIMIT = 12;

export function SourcePanel() {
  const { settings, dispatch } = useSettings();
  const { load, retry } = useWords();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    dispatch({ type: "setSource", source: event.target.value });
  };

  return (
    <section className="source">
      <label htmlFor="source-select">Источник слов</label>
      <select
        id="source-select"
        value={settings.source}
        onChange={handleChange}
      >
        <option value={SOURCE_BUILTIN}>Встроенный словарь</option>
        {[...LETTERS].map((letter) => (
          <option key={letter} value={letter}>
            Википедия: слова на «{letter.toUpperCase()}»
          </option>
        ))}
      </select>
      <div className="source-state" aria-live="polite">
        {load.status === "idle" && <p>Играем со встроенным словарём.</p>}
        {load.status === "loading" && <p>Загружаем слова…</p>}
        {load.status === "error" && (
          <div role="alert">
            <p>
              Не удалось загрузить слова: {load.message}. Пока играем со
              встроенным словарём.
            </p>
            <button type="button" onClick={retry}>
              Повторить
            </button>
          </div>
        )}
        {load.status === "ready" && load.words.length === 0 && (
          <p>Ничего не найдено. Играем со встроенным словарём.</p>
        )}
        {load.status === "ready" && load.words.length > 0 && (
          <>
            <p>Найдено слов: {load.words.length}</p>
            <ul className="found" aria-label="Найденные слова">
              {load.words.slice(0, PREVIEW_LIMIT).map((word) => (
                <li key={word}>{word}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
