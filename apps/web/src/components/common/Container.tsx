/**
 * Container Component
 * Provides consistent page container with responsive max-width
 */

import { Container as MuiContainer, ContainerProps } from "@mui/material";

interface Props extends ContainerProps {
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}

export default function Container({ children, maxWidth = "lg", ...props }: Props) {
  return (
    <MuiContainer maxWidth={maxWidth} {...props}>
      {children}
    </MuiContainer>
  );
}
