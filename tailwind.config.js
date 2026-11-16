/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ---------------------------------------------------------------
         * GenDocs — tokens extraídos do bundle real da plataforma
         * (index-CCgMxhEZ.css, :root --brand-*). Não alterar sem conferir
         * o CSS original em "Gendocs htmls e referencias".
         * ------------------------------------------------------------- */
        gd: {
          'white-green': '#e0ffdb',
          'green-100': '#24c62c',
          'green-200': '#18aa41',
          red: '#d71919',
          'white-blue': '#f0f7ff',
          'light-blue': '#3cc4dd',
          blue: '#4b91e2',
          'blue-10': '#f0f7ff',
          'blue-50': '#e6f1ff',
          'blue-100': '#1476ff',
          'blue-200': '#1c3f73',
          'blue-400': '#17345e',
          'blue-800': '#1c1f26',
          gray: '#fafafa',
          'gray-50': '#f5f5f5',
          'gray-100': '#bdbdbd',
          'gray-400': '#767677',
          black: '#212121',
          'white-orange': '#fff2e0',
          orange: '#ff9500',
        },

        /* ---------------------------------------------------------------
         * ERP UniFatecie (System by Inova) — tokens exatos do :root do
         * bundle real (fc49adfe748bcf83.css), em
         * "ERP html e referencias/".
         * ------------------------------------------------------------- */
        erp: {
          primary: '#ed8020',
          'primary-opacity': '#ed802027',
          hover: '#d1570e',
          active: '#ad3b10',
          secondary: '#ffffff',
          error: '#d00c0c',
          'error-hover': '#a40a0a',
          black: '#141414',
          'white-gray': '#eaeaea',
          'white-transparent': '#b6b6b6',
          'light-gray': '#cdcdcd',
          'dark-gray': '#a4a4a4',
          success: '#18aa41',
          blue: '#3c96ff',
          lexp: '#0c8ce9',
          disabled: '#ffd099',
          'disabled-2': '#ffb969',
          /* --background: 0 0% 98% */
          bg: '#fafafa',
        },

        /* ---------------------------------------------------------------
         * Landing page de captação. O layout vem do EvoluiTec (referência
         * em "landing page html e referencias/"), mas a identidade trocou:
         * o roxo `--deep-purple-800 #4527a0` virou o azul esverdeado, e o
         * verde de etapa concluída virou o verde da marca.
         * ------------------------------------------------------------- */
        lp: {
          DEFAULT: '#00BAB4',
          primary: '#00BAB4',
          'primary-dark': '#009B96',
          green: '#069E6E',
          'green-dark': '#05835B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        /* O ERP roda Lato (next/font local: __Lato_79853d). */
        erp: ['Lato', 'Inter', 'system-ui', 'sans-serif'],
        /* A landing page original usa a pilha de fonte do sistema. */
        lp: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto',
          'Helvetica Neue', 'Noto Sans', 'Arial', 'sans-serif',
        ],
      },
      boxShadow: {
        /* GenDocs (valores do bundle original) */
        'gd-menu-card': '0px 4px 15px 0px #0000001f',
        'gd-document-card': '0px 4px 20px 0px #0000001f',
        'gd-kpi': '0px 4px 8px 0px #0000001f',
        'gd-collections-card': '0px 4px 20px 0px #0003',
        'gd-row-hover': '0 6px 16px -4px rgba(0,0,0,0.14)',
        /* ERP (valores do bundle original) */
        'erp-table-row': '0px 4px 8px 0px #0000002a',
        'erp-table-row-hover': '0px 8px 18px 0px #0000002a',
        'erp-new-button': '0px 4px 9px 0px #00000026',
        'erp-details': '0px 14px 45px 4px #0000001a',
        'erp-user-card': '0px 8px 8px rgba(0,0,0,0.1)',
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
    },
  },
  plugins: [],
}
