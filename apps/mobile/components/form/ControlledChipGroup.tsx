import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import type { ChipGroupProps } from "@/components/ui/ChipGroup";
import { ChipGroup } from "@/components/ui/ChipGroup";

interface ControlledChipGroupProps<
  T extends FieldValues,
  V extends string | number,
> extends Omit<ChipGroupProps<V>, "value" | "onChange" | "error"> {
  name: Path<T>;
}

export function ControlledChipGroup<
  T extends FieldValues,
  V extends string | number,
>({ name, ...props }: ControlledChipGroupProps<T, V>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <ChipGroup
          {...props}
          value={value as V}
          onChange={onChange}
          error={error?.message}
        />
      )}
    />
  );
}
