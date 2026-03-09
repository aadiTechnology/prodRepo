/**
 * DeleteButton — Semantic component
 * Represents "delete" / destructive intent. Uses Button primitive.
 */

import { Button, type ButtonProps } from "../primitives";

export interface DeleteButtonProps extends Omit<ButtonProps, "children"> {
  children?: React.ReactNode;
}

export default function DeleteButton({
  children = "Delete",
  variant = "contained",
  color = "error",
  ...props
}: DeleteButtonProps) {
  return (
    <Button variant={variant} color={color} {...props}>
      {children}
    </Button>
  );
}
