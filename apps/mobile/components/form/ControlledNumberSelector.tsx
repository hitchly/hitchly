import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import type { NumberSelectorProps } from "@/components/ui/NumberSelector";
import { NumberSelector } from "@/components/ui/NumberSelector";

interface ControlledNumberSelectorProps<T extends FieldValues> extends Omit<
  NumberSelectorProps,
  "value" | "onChange" | "error"
> {
  name: Path<T>;
}

export function ControlledNumberSelector<T extends FieldValues>({
  name,
  ...props
}: ControlledNumberSelectorProps<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const { onChange, value } = field as ControllerRenderProps<T, Path<T>>;

        return (
          <NumberSelector
            {...props}
            onChange={onChange}
            value={typeof value === "number" ? value : undefined}
            error={error?.message}
          />
        );
      }}
    />
  );
}
