import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import type { NumericStepperProps } from "@/components/ui/NumericStepper";
import { NumericStepper } from "@/components/ui/NumericStepper";

interface ControlledNumericStepperProps<T extends FieldValues> extends Omit<
  NumericStepperProps,
  "value" | "onValueChange" | "error"
> {
  name: Path<T>;
}

export function ControlledNumericStepper<T extends FieldValues>({
  name,
  ...props
}: ControlledNumericStepperProps<T>) {
  const { control } = useFormContext<T>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <NumericStepper
          {...props}
          value={value}
          onValueChange={onChange}
          error={error?.message}
        />
      )}
    />
  );
}
