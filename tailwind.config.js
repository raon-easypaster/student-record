/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#38aef9',
          500: '#0e94eb',
          600: '#0276ca',
          700: '#035ea3',
          800: '#075086',
          900: '#0c436f',
        }
      }
    },
  },
  plugins: [],
}
