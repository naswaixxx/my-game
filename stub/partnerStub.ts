import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { TITLES } from "./titles.ts";

export const STUB_PREFIX = "/partner-stub";

interface Mode {
  delayMs: number;
  status: number;
}

const DEFAULT_MODE: Mode = { delayMs: 0, status: 200 };
const MAX_DELAY_MS = 60_000;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function toNumber(value: string | null, fallback: number): number {
  const number = Number(value);
  return value !== null && Number.isFinite(number) ? number : fallback;
}

export function createStubHandler() {
  const mode: Mode = { ...DEFAULT_MODE };

  return (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ): void => {
    const url = new URL(req.url ?? "/", "http://stub.local");
    if (url.pathname === `${STUB_PREFIX}/__control`) {
      if (url.searchParams.has("reset")) Object.assign(mode, DEFAULT_MODE);
      mode.delayMs = Math.min(
        Math.max(toNumber(url.searchParams.get("delay"), mode.delayMs), 0),
        MAX_DELAY_MS
      );
      mode.status = toNumber(url.searchParams.get("status"), mode.status);
      sendJson(res, 200, mode);
      return;
    }
    if (url.pathname !== `${STUB_PREFIX}/w/api.php`) {
      next();
      return;
    }
    const prefix = (url.searchParams.get("pssearch") ?? "").toLowerCase();
    const limit = toNumber(url.searchParams.get("pslimit"), 10);
    setTimeout(() => {
      if (mode.status !== 200) {
        sendJson(res, mode.status, {
          error: { code: "stub", info: "Заглушка отвечает ошибкой" },
        });
        return;
      }
      const prefixsearch = TITLES.filter((title) =>
        title.toLowerCase().startsWith(prefix)
      )
        .slice(0, limit)
        .map((title, index) => ({ ns: 0, title, pageid: index + 1 }));
      sendJson(res, 200, { batchcomplete: true, query: { prefixsearch } });
    }, mode.delayMs);
  };
}

export function partnerStub(): Plugin {
  const handler = createStubHandler();
  return {
    name: "partner-stub",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
