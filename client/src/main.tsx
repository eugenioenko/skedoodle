import { createRoot } from "react-dom/client";
import { App } from "./components/app.tsx";
import { SketchesPage } from "./components/page-sketches.tsx";
import { LocalSketchesPage } from "./components/page-local-sketches.tsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "rc-slider/assets/index.css";
import { LoginPage } from "./components/page-login.tsx";
import { CallbackPage } from "./components/page-callback.tsx";
import { LogoutPage } from "./components/page-logout.tsx";
import { AuthGuard } from "./components/auth-guard.tsx";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<CallbackPage />} />
      <Route path="/auth/logout" element={<LogoutPage />} />
      <Route path="/sandbox" element={<App isLocal={true} />} />
      <Route path="/local" element={<LocalSketchesPage />} />
      <Route path="/local/:id" element={<App isLocal={true} isLocalPersisted={true} />} />
      <Route path="/" element={<SketchesPage />} />
      <Route path="/sketches" element={<SketchesPage />} />
      <Route element={<AuthGuard />}>
        <Route path="/sketch/:id" element={<App />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
