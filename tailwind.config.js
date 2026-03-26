/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        slate_bg: "#1A202C",
        grid_line: "#2D3748",
        teal_neon: "#4FD1C5",
        orange_sun: "#F6AD55",
        purple_lav: "#B794F4",
        coral_soft: "#FC8181",
        success: "#68D391",
      },
    },
  },
  plugins: [],
};
