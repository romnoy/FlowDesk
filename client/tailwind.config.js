/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#0B0F19",
          800: "#151B2C",
          700: "#1F2A45",
          600: "#2D3748",
        },
        primary: {
          500: "#6366F1",
          600: "#4F46E5",
        },
        accent: {
          blue: "#3B82F6",
          red: "#EF4444",
          green: "#10B981",
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
