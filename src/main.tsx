import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { App } from "./App.tsx";
import { Providers } from "./Providers.tsx";

const container = document.getElementById("root");
if (!container) throw new Error("Не найден элемент #root");

createRoot(container).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
);
