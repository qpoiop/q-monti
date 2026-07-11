import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./design/globals.css";

// StrictMode is intentionally OFF in production — Cloudflare Pages ships the
// production React build, and the double-invoke amplifies module-level
// singletons (transport, router, install listeners) that are safe under a
// single mount. Re-enable for local dev if you want strict warnings.
createRoot(document.getElementById("root")!).render(<App />);
// Dismiss splash once React has mounted; the CSS hides #splash when the
// body picks up this class.
requestAnimationFrame(() => document.body.classList.add("app-ready"));
