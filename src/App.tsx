import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PortPanel } from "./components/PortPanel";
import "./App.css";

function App() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        invoke("hide_panel");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <PortPanel />;
}

export default App;
