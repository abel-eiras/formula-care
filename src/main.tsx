import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Montserrat empaquetada con la app (sin Google Fonts: funciona sin conexión)
import "@fontsource/montserrat/latin-300.css";
import "@fontsource/montserrat/latin-400.css";
import "@fontsource/montserrat/latin-500.css";
import "@fontsource/montserrat/latin-600.css";
import "@fontsource/montserrat/latin-700.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
