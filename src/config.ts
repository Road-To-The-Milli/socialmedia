export const APP_CONFIG = {
  n8nBaseUrl: import.meta.env.VITE_N8N_BASE_URL || "https://n8n.samuelrilos.com/webhook",
  n8nApiKey:
    import.meta.env.VITE_N8N_API_KEY ||
    "a58d49ae13d73706115681d14de53bd6857a88652b6cca8669a290898fcaac64",
  seasonEndDate: import.meta.env.VITE_SEASON_END_DATE || "2025-06-30",
  appBaseUrl:
    import.meta.env.VITE_APP_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"),
  codes: {
    samuel: import.meta.env.VITE_CODE_SAMUEL || "nerve",
    mathilde: import.meta.env.VITE_CODE_MATHILDE || "samleboss",
    amisSamuel: import.meta.env.VITE_CODE_AMIS_SAMUEL || "lesmeilleurs",
    amisMathilde: import.meta.env.VITE_CODE_AMIS_MATHILDE || "quelcourage",
  },
};
