import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#e6f5f2" }, // Very light teal/green - almost white
          100: { value: "#b3e6d9" }, // Light mint green
          200: { value: "#80d6c0" }, // Soft seafoam green
          300: { value: "#4dc6a7" }, // Medium teal-green
          400: { value: "#26b68e" }, // Vibrant teal
          500: { value: "#00a676" }, // Primary brand teal-green
          600: { value: "#008f66" }, // Slightly darker teal
          700: { value: "#007a56" }, // Deep teal-green
          800: { value: "#006646" }, // Very deep green
          900: { value: "#005236" }, // Dark forest green
          950: { value: "#003322" }, // Darkest green, almost black
        },
        accent: {
          50: { value: "#fff4e6" }, // Very light orange
          100: { value: "#ffebd3" }, // Soft peach
          200: { value: "#ffd9a8" }, // Light orange
          300: { value: "#ffc37d" }, // Warm orange
          400: { value: "#ffad52" }, // Vibrant orange
          500: { value: "#e0e0e0" }, // Primary accent orange
          600: { value: "#e68420" }, // Deeper orange
          700: { value: "#cc7118" }, // Rich burnt orange
          800: { value: "#b35f10" }, // Dark orange
          900: { value: "#994e08" }, // Very dark orange
          950: { value: "#803f00" }, // Darkest orange
        },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: "{colors.brand.500}" }, // Primary brand color
          contrast: { value: "{colors.brand.50}" }, // Light background/contrast
          fg: { value: "{colors.brand.700}" }, // Foreground text
          muted: { value: "{colors.brand.200}" }, // Muted elements
          subtle: { value: "{colors.brand.100}" }, // Subtle background
          emphasized: { value: "{colors.brand.300}" }, // Emphasized elements
          focusRing: { value: "{colors.brand.500}" }, // Focus indicators
        },
        accent: {
          solid: { value: "{colors.accent.500}" }, // Accent color for highlights
          contrast: { value: "{colors.accent.50}" }, // Light accent background
          fg: { value: "{colors.accent.700}" }, // Accent foreground
          muted: { value: "{colors.accent.300}" }, // Muted accent elements
          subtle: { value: "{colors.accent.200}" }, // Subtle accent background
          emphasized: { value: "{colors.accent.400}" }, // Emphasized accent
          focusRing: { value: "{colors.accent.600}" }, // Accent focus indicators
        },
        bg: {
          solid: { value: "{colors.brand.50}" },
          contrast: { value: "#ffffff" },
          fg: { value: "{colors.brand.700}" },
          muted: { value: "{colors.brand.100}" },
          subtle: { value: "{colors.brand.200}" },
          emphasized: { value: "{colors.brand.300}" },
          focusRing: { value: "{colors.brand.500}" },
        },
      },
    },
  },
});
