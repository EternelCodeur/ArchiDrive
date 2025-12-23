import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if ("serviceWorker" in navigator) {
  try {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        try { void r.unregister(); } catch { void 0 }
      });
    });
  } catch { void 0 }
}

createRoot(document.getElementById("root")!).render(<App />);
