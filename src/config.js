// src/config.js
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const IS_PRODUCTION = import.meta.env.NODE_ENV === "production";