import type { ComponentProps } from "react";
import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/Button";

type SubmitButtonProps = ComponentProps<typeof Button>;

export function SubmitButton({
  onPress,
  isLoading,
  disabled,
  ...props
}: SubmitButtonProps) {
  const {
    formState: { isValid, isSubmitting },
  } = useFormContext();

  return (
    <Button
      {...props}
      onPress={onPress}
      isLoading={isLoading ?? isSubmitting}
      disabled={(disabled ?? !isValid) || isSubmitting}
    />
  );
}
