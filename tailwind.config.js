/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'pokemon': ['Fredoka', 'Exo 2', 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
