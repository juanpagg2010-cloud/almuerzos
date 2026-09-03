/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eff6ff", 100: "#dbeafe", 500: "#1976d2", 600: "#1266bd", 700: "#0e4f92", 900: "#0b2d55" },
      },
      fontFamily: { sans: ["Arial", "Helvetica", "sans-serif"] },
    },
  },
  plugins: [],
};
