/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#4F46E5", // indigo
          DEFAULT: "#4338CA", // koyu indigo
          dark: "#3730A3", // daha koyu indigo
        },
        secondary: {
          light: "#7C3AED", // violet
          DEFAULT: "#6D28D9", // koyu violet
          dark: "#5B21B6", // daha koyu violet
        },
      },
    },
  },
  plugins: [],
};
