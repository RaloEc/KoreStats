/** @type {import('tailwindcss').Config} */
const { fontFamily } = require("tailwindcss/defaultTheme");
const { nextui } = require("@nextui-org/react");

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      borderColor: {
        'border-color': 'hsl(var(--border))',
      },
      colors: {
        // Colores base con soporte para temas claro/oscuro
        accent: {
          light: 'hsl(var(--accent-light))',
          dark: 'hsl(var(--accent-dark))',
          DEFAULT: 'hsl(var(--accent-light))',
          // Variantes de opacidad para hover, etc.
          lightHover: 'hsl(var(--accent-light) / 0.8)',
          darkHover: 'hsl(var(--accent-dark) / 0.8)',
          lightBg: 'hsl(var(--accent-light) / 0.1)',
          darkBg: 'hsl(var(--accent-dark) / 0.1)',
        },
        // Colores temáticos con sus variantes claro/oscuro
        theme: {
          azul: {
            light: '#6366F1',
            dark: '#3730A3'
          },
          verde: {
            light: '#34D399',
            dark: '#065F46'
          },
          rojo: {
            light: '#F87171',
            dark: '#991B1B'
          },
          amarillo: {
            light: '#FACC15',
            dark: '#B45309'
          },
          violeta: {
            light: '#A78BFA',
            dark: '#5B21B6'
          },
          turquesa: {
            light: '#22D3EE',
            dark: '#0E7490'
          },
          naranja: {
            light: '#FB923C',
            dark: '#C2410C'
          },
          rosa: {
            light: '#F472B6',
            dark: '#9D174D'
          },
          grisAzulado: {
            light: '#94A3B8',
            dark: '#334155'
          }
        },
        // Colores base de la aplicación
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        amoled: {
          black: "#000000",
          dark: "#050505",
          gray: "#121212",
        },
        minecraft: {
          blue: {
            50: "#E3F2FD",
            100: "#BBDEFB",
            200: "#90CAF9",
            300: "#64B5F6",
            400: "#42A5F5",
            500: "#2196F3",
            600: "#1E88E5",
            700: "#1976D2",
            800: "#1565C0",
            900: "#0D47A1",
          },
          diamond: "#4AEDD9",
          obsidian: "#150E1F",
          stone: "#7D7D7D",
          wood: "#A0522D",
          dirt: "#866043",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
        heading: ["Inter", ...fontFamily.sans],
        minecraft: ["Inter", ...fontFamily.sans],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '0 0' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        "theme-slide-right": {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        "theme-slide-down": {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        "gradient-flow": {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: 'fadeIn 0.3s ease-out',
        fadeOut: 'fadeOut 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        pulse: 'pulse 1.5s ease-in-out infinite',
        "theme-slide-right": 'theme-slide-right 0.7s ease-in-out',
        "theme-slide-down": 'theme-slide-down 0.7s ease-in-out',
        "gradient-flow": 'gradient-flow 15s ease infinite',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.gray[800]'),
            '--tw-prose-headings': theme('colors.gray[900]'),
            '--tw-prose-lead': theme('colors.gray[600]'),
            '--tw-prose-links': theme('colors.gray[900]'),
            '--tw-prose-bold': theme('colors.gray[900]'),
            '--tw-prose-counters': theme('colors.gray[500]'),
            '--tw-prose-bullets': theme('colors.gray[300]'),
            '--tw-prose-hr': theme('colors.gray[200]'),
            '--tw-prose-quotes': theme('colors.gray[900]'),
            '--tw-prose-quote-borders': theme('colors.gray[200]'),
            '--tw-prose-captions': theme('colors.gray[500]'),
            '--tw-prose-code': theme('colors.gray[900]'),
            '--tw-prose-pre-code': theme('colors.gray[800]'),
            '--tw-prose-pre-bg': theme('colors.stone[100]'),
            '--tw-prose-th-borders': theme('colors.gray[300]'),
            '--tw-prose-td-borders': theme('colors.gray[200]'),
            // ... Agrega más personalizaciones si es necesario
          },
        },
        invert: {
          css: {
            '--tw-prose-body': theme('colors.stone[200]'),
            '--tw-prose-headings': theme('colors.stone[50]'),
            '--tw-prose-lead': theme('colors.stone[300]'),
            '--tw-prose-links': theme('colors.white'),
            '--tw-prose-bold': theme('colors.white'),
            '--tw-prose-counters': theme('colors.stone[300]'),
            '--tw-prose-bullets': theme('colors.stone[500]'),
            '--tw-prose-hr': theme('colors.stone[800]'),
            '--tw-prose-quotes': theme('colors.stone[50]'),
            '--tw-prose-quote-borders': theme('colors.stone[700]'),
            '--tw-prose-captions': theme('colors.stone[400]'),
            '--tw-prose-code': theme('colors.white'),
            '--tw-prose-pre-code': theme('colors.stone[200]'),
            '--tw-prose-pre-bg': theme('colors.stone[800]'),
            '--tw-prose-th-borders': theme('colors.stone[500]'),
            '--tw-prose-td-borders': theme('colors.stone[700]'),
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require("tailwindcss-animate"),
    nextui(),
    function({ addVariant }) {
      addVariant('amoled', '.amoled &')
    }
  ],
}
