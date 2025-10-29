import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGlobalErrorHandlers } from "@/lib/globalErrorHandlers";
import { systemLogger } from "@/lib/browserLogger";

// Initialiser les gestionnaires d'erreurs globaux
initializeGlobalErrorHandlers();

// Logger le démarrage de l'application
systemLogger.startup({
  userAgent: navigator.userAgent,
  language: navigator.language,
});

createRoot(document.getElementById("root")!).render(<App />);
