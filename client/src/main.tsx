import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/app.tsx";
import { SketchesPage } from "./components/page-sketches.tsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "rc-slider/assets/index.css";
import { LoginPage } from "./components/page-login.tsx";
import { RegisterPage } from "./components/page-register.tsx";
import { AuthGuard } from "./components/auth-guard.tsx";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<SketchesPage />} />
      <Route path="/sketches" element={<SketchesPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/sketch/:id" element={<App />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
