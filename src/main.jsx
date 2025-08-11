// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "leaflet/dist/leaflet.css"; // penting untuk ikon & tile Leaflet

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// SW register harus di luar render
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      // gunakan BASE_URL supaya path valid di Pages subfolder
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((err) => console.warn('SW register failed:', err));
  });
}

