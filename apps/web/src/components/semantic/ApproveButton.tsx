/**
 * ApproveButton — Semantic component
 * Represents "approve" intent. Uses Button primitive.
 */

import { Button, type ButtonProps } from "../primitives";

export interface ApproveButtonProps extends Omit<ButtonProps, "children"> {
  children?: React.ReactNode;
}

export default function ApproveButton({
  children = "Approve",
  variant = "contained",
  color = "success",
  ...props
}: ApproveButtonProps) {
  return (
    <Button variant={variant} color={color} {...props}>
      {children}
    </Button>
  );
}
