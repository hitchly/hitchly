import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import type { DateTimePickerProps } from "@/components/ui/DateTimePicker";
import { DateTimePicker } from "@/components/ui/DateTimePicker";

interface ControlledDateTimePickerProps<T extends FieldValues> extends Omit<
  DateTimePickerProps,
  "value" | "onChange" | "error"
> {
  name: Path<T>;
}

export function ControlledDateTimePicker<T extends FieldValues>({
  name,
  ...props
}: ControlledDateTimePickerProps<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value }, fieldState: { error } }) => {
        const dateValue =
          (value as unknown) instanceof Date
            ? (value as unknown as Date)
            : value
              ? new Date(value as string | number)
              : new Date();

        return (
          <DateTimePicker
            {...props}
            value={dateValue}
            onChange={onChange}
            error={error?.message}
          />
        );
      }}
    />
  );
}
