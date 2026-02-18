import React from "react";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";
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
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => {
        const { onChange, onBlur, value } = field as ControllerRenderProps<
          T,
          Path<T>
        >;

        return (
          <Input
            {...props}
            onBlur={onBlur}
            onChangeText={onChange}
            value={
              typeof value === "string"
                ? value
                : ((value as string | undefined)?.toString() ?? "")
            }
            error={error?.message}
          />
        );
      }}
    />
  );
}
