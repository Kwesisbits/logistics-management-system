/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-base':    '#091413',
        'deep-green':   '#285A48',
        'medium-green': '#408A71',
        'mint':         '#B0E4CC',
        'light-bg':     '#F4F9F7',
      },
    },
  },
  plugins: [],
}