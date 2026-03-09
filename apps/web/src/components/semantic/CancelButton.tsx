/**
 * CancelButton — Semantic component
 * Represents "cancel" intent. Uses Button primitive.
 */

import { Button, type ButtonProps } from "../primitives";

export interface CancelButtonProps extends Omit<ButtonProps, "children"> {
  children?: React.ReactNode;
}

export default function CancelButton({
  children = "Cancel",
  variant = "outlined",
  ...props
}: CancelButtonProps) {
  return <Button variant={variant} {...props}>{children}</Button>;
}
