import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import type { SegmentedControlProps } from "@/components/ui/SegmentedControl";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

interface ControlledSegmentedControlProps<
  T extends FieldValues,
  V extends string | number,
> extends Omit<SegmentedControlProps<V>, "value" | "onChange" | "error"> {
  name: Path<T>;
}

export function ControlledSegmentedControl<
  T extends FieldValues,
  V extends string | number,
>({ name, ...props }: ControlledSegmentedControlProps<T, V>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <SegmentedControl
          {...props}
          value={value as V}
          onChange={onChange}
          error={error?.message}
        />
      )}
    />
  );
}
