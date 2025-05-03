/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily : {
        kaushan: ['Kaushan Script', 'sans-serif'],
        mulish: ['Mulish', 'sans-serif']
      }
    },
  },
  plugins: [],
}

