import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  safelist: [
    // Program palette — dynamic classes from src/shared/utils/programColors.ts
    // Must match ALLOWED_COLORS in that file.
    ...[
      "emerald", "blue", "violet", "orange", "rose", "cyan", "amber", "pink",
      "teal", "indigo", "slate", "purple", "red", "yellow", "green", "sky",
      "fuchsia", "lime",
    ].flatMap((c) => [
      // hero gradient
      `from-${c}-500`, `to-${c}-700`,
      // banner soft gradient
      `from-${c}-500/15`, `via-${c}-500/5`,
      `border-${c}-500/30`, `hover:border-${c}-500/50`,
      // icon
      `bg-${c}-500/15`, `text-${c}-600`, `dark:text-${c}-400`,
      // badge outline
      `border-${c}-300`, `bg-${c}-50`, `text-${c}-700`,
      `dark:border-${c}-700`, `dark:bg-${c}-950/40`,
      // badge active
      `bg-${c}-200`, `text-${c}-800`,
      // progress + accent borders
      `bg-${c}-500`, `border-t-${c}-500`, `border-l-${c}-500`,
      // soft accent surfaces
      `bg-${c}-500/10`, `hover:bg-${c}-500/15`,
      // subtle border + ring
      `border-${c}-500/20`, `ring-${c}-500/40`,
    ]),
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Epilogue"', 'system-ui', 'sans-serif'],
        body:    ['"Plus Jakarta Sans"', '"Source Sans 3"', '"Epilogue"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
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
        dark: {
          DEFAULT: "hsl(var(--dark))",
          foreground: "hsl(var(--dark-foreground))",
          muted: "hsl(var(--dark-muted))",
        },
        exam: {
          header: "hsl(var(--exam-header))",
          "header-foreground": "hsl(var(--exam-header-foreground))",
          sidebar: "hsl(var(--exam-sidebar))",
          highlight: "hsl(var(--exam-highlight))",
          correct: "hsl(var(--exam-correct))",
          incorrect: "hsl(var(--exam-incorrect))",
          unanswered: "hsl(var(--exam-unanswered))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Sticker-pop palette (synced via lp-sticker-tokens.css)
        lp: {
          coral:        "var(--lp-coral)",
          "coral-deep": "var(--lp-coral-deep)",
          "coral-soft": "var(--lp-coral-soft)",
          teal:         "var(--lp-teal)",
          "teal-deep":  "var(--lp-teal-deep)",
          "teal-soft":  "var(--lp-teal-soft)",
          yellow:        "var(--lp-yellow)",
          "yellow-soft": "var(--lp-yellow-soft)",
          violet:        "var(--lp-violet)",
          "violet-soft": "var(--lp-violet-soft)",
          sky:    "var(--lp-sky)",
          pink:   "var(--lp-pink)",
          rose:   "var(--lp-rose)",
          mint:   "var(--lp-mint)",
          cream:  "var(--lp-cream)",
          ink:    "var(--lp-ink)",
          "ink-2": "var(--lp-ink-2)",
          body:   "var(--lp-body)",
          bg:     "var(--lp-bg)",
        },
      },
      boxShadow: {
        "pop-xs": "2px 2px 0 0 var(--lp-ink)",
        "pop-sm": "4px 4px 0 0 var(--lp-ink)",
        "pop":    "6px 6px 0 0 var(--lp-ink)",
        "pop-lg": "8px 8px 0 0 var(--lp-ink)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pop:      "18px",
        "pop-lg": "20px",
      },
      transitionTimingFunction: {
        bounce: "cubic-bezier(.34, 1.56, .64, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "enter": "fade-in 0.3s ease-out, scale-in 0.2s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
