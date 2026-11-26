import { useState } from "react";

export default function BotonTema() {
  const [oscuro, setOscuro] = useState(document.documentElement.dataset.tema === "dark");

  const cambiar = () => {
    const nuevo = oscuro ? "light" : "dark";
    document.documentElement.dataset.tema = nuevo;
    localStorage.setItem("tema", nuevo);
    setOscuro(!oscuro);
  };

  return (
    <button type="button" className="tema" onClick={cambiar}>
      {oscuro ? "☀️ Light Mode" : "🌙 Dark Mode"}
    </button>
  );
}
