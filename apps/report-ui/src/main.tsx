import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuditDataProvider } from "./audit-data.tsx";
import { router } from "./router.tsx";
import "@xyflow/react/dist/style.css";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing report UI root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuditDataProvider>
      <RouterProvider router={router} />
    </AuditDataProvider>
  </StrictMode>,
);
