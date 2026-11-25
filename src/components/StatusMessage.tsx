import { useGameSelector } from "../store/GameContext.tsx";

export function StatusMessage() {
  const over = useGameSelector((state) => state.status === "over");

  return (
    <p id="message" role="status">
      {over
        ? "Игра окончена. Нажмите «Новая игра»"
        : "Печатайте слово из списка и нажимайте Enter"}
    </p>
  );
}
