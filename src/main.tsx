import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import GlobalServiceProvider from "./GlobalServiceProvider.tsx";

// Create two roots for multiplayer
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GlobalServiceProvider>
      <App />
    </GlobalServiceProvider>
  </React.StrictMode>
);
