import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./components/ToastProvider";
import "./index.css";
import "./theme.css";
import "./dashboard-cleanup.css";
import "./ui-polish.css";
import "./portal-theme.css";
import "./portal-layout-fixes.css";

const forceLightMode = () => {
  const root = document.documentElement;
  root.dataset.theme = "light";
  root.classList.remove("theme-dark", "theme-soft");
  root.classList.add("theme-light");

  try {
    localStorage.removeItem("homeboost-theme-preference");
  } catch {
    // The app remains in light mode even when storage is unavailable.
  }
};

forceLightMode();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
