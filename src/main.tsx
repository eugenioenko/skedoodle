import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/app.tsx";
import { SketchesPage } from "./components/sketches-page.tsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "rc-slider/assets/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SketchesPage />} />
        <Route path="/sketches" element={<SketchesPage />} />
        <Route path="/sketch/:id" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
