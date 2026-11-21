import { memo } from "react";

interface StatusMessageProps {
  readonly over: boolean;
}

export const StatusMessage = memo(function StatusMessage({
  over,
}: StatusMessageProps) {
  return (
    <p id="message" role="status">
      {over
        ? "Игра окончена. Нажмите «Новая игра»"
        : "Печатайте слово из списка и нажимайте Enter"}
    </p>
  );
});
