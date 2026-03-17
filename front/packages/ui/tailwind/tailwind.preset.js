/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        lp: {
          primary: "var(--lp-primary)",
          accent: "var(--lp-accent)",
          bg: "var(--lp-bg)",
          surface: "var(--lp-surface)",
          border: "var(--lp-border)",
          text: "var(--lp-text)",
          muted: "var(--lp-muted)",
          danger: "var(--lp-danger)",
          success: "var(--lp-success)",
          warning: "var(--lp-warning)",
        },
      },
      borderRadius: {
        "lp-card": "var(--lp-radius-card)",
        "lp-container": "var(--lp-radius-container)",
        "lp-control": "var(--lp-radius-control)",
      },
      boxShadow: {
        "lp-sm": "var(--lp-shadow-sm)",
        "lp-md": "var(--lp-shadow-md)",
        "lp-xl": "var(--lp-shadow-xl)",
      },
    },
  },
};
