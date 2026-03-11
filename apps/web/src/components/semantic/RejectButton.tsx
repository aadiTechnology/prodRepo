/**
 * RejectButton — Semantic component
 * Represents "reject" intent. Uses Button primitive.
 */

import { Button, type ButtonProps } from "../primitives";

export interface RejectButtonProps extends Omit<ButtonProps, "children"> {
  children?: React.ReactNode;
}

export default function RejectButton({
  children = "Reject",
  variant = "outlined",
  color = "error",
  ...props
}: RejectButtonProps) {
  return (
    <Button variant={variant} color={color} {...props}>
      {children}
    </Button>
  );
}
