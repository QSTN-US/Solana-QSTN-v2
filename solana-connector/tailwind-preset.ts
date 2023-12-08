/** @type {import('tailwindcss').Config} */

//const defaultTheme = require('tailwindcss/defaultTheme');

const navyColor = {
  50: '#CDE4FF',
  100: '#A7C3FF',
  200: '#8DADFF',
  300: '#3772FF',
  400: '#0059E1',
  500: '#0042C3',
  600: '#002CA6',
  700: '#001A8A'
};

const qstnColor = {
  //50: '#FCFCFD',
  50: '#F7F6FB',
  100: '#C4C4C5',
  200: '#8F8F90',
  300: '#5D5D5E',
  400: '#303031',
  500: '#F7F6FB'
};

const customColors = {
  navy: navyColor,
  qstn: qstnColor
};

module.exports = {
  theme: {
    extend: {
      colors: { ...customColors },
      fontFamily: {
        'segoe-ui': ["'Segoe UI', sans-serif"],
        poppins: ["'__poppinsRegular_2609e0'"],
        'poppins-light': ["'__poppinsLight_243121'"],
        'poppins-medium': ["'__poppinsMedium_bf090a'"],
        'poppins-semibold': ["'__poppinsSemiBold_86ead2'"],
        'poppins-bold': ["'__poppinsBold_89983c'"],
        'poppins-black': ["'__poppinsBlack_bdd8bd'"]
      },
      darkMode: 'class',
      container: {
        padding: {
          md: '1rem',
          lg: '2rem'
        }
      },
      animation: {
        'spin-slow': 'spin 5s linear infinite'
      },
      keyframes: {
        'fade-in': {
          '0%': {
            opacity: '0'
          },
          '100%': {
            opacity: '1'
          }
        },
        'fade-out': {
          '0%': {
            opacity: '1',
            visibility: 'visible'
          },
          '100%': {
            opacity: '0',
            visibility: 'hidden'
          }
        }
      }
    }
  }
};
