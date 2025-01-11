import { defineRecipe } from "@chakra-ui/react";

export const buttonRecipe = defineRecipe({
  base: {
    display: "flex",
    maxW: "1000px",
    padding: "0.7em 1.7em",
    borderRadius: "0.5em",
    cursor: "pointer",
  },
  variants: {
    visual: {
      solid: {
        bg: "#e8e8e8",
        color: "#090909",
        border: "1px solid #e8e8e8",
        boxShadow: "6px 6px 12px #c5c5c5,-6px -6px 12px #ffffff",
      },
    },
  },
});
