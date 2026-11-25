import { useSettings } from "../settings/SettingsContext.tsx";

export function ThemeToggle() {
  const { settings, dispatch } = useSettings();
  const dark = settings.theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={dark}
      onClick={() =>
        dispatch({ type: "setTheme", theme: dark ? "light" : "dark" })
      }
    >
      Тёмная тема
    </button>
  );
}
