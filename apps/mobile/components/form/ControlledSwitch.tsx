import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import type { SwitchRowProps } from "@/components/ui/Switch";
import { SwitchRow } from "@/components/ui/Switch";

interface ControlledSwitchProps<T extends FieldValues> extends Omit<
  SwitchRowProps,
  "value" | "onChange"
> {
  name: Path<T>;
}

export function ControlledSwitch<T extends FieldValues>({
  name,
  ...props
}: ControlledSwitchProps<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <SwitchRow {...props} value={!!value} onChange={onChange} />
      )}
    />
  );
}
