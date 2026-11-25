import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Acceso from "./Acceso.jsx";
import "./estilos.css";
createRoot(document.getElementById("root")).render(
  <Acceso><App /></Acceso>
);
