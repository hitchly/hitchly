import type { FieldValues, Path, PathValue } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import type { InputProps } from "@/components/ui/Input";
import { Input } from "@/components/ui/Input";

interface ControlledInputProps<T extends FieldValues> extends Omit<
  InputProps,
  "error" | "value" | "onChangeText" | "onBlur"
> {
  name: Path<T>;
}

export function ControlledInput<T extends FieldValues>({
  name,
  ...props
}: ControlledInputProps<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      name={name}
      control={control}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <Input
          {...props}
          onBlur={onBlur}
          onChangeText={(text: string) => {
            onChange(text as PathValue<T, Path<T>>);
          }}
          value={value === undefined || value === null ? "" : String(value)}
          error={error?.message}
        />
      )}
    />
  );
}
