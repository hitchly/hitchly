import type { FieldValues, Path } from "react-hook-form";
import { Controller, useFormContext } from "react-hook-form";

import { Switch } from "@/components/ui/Switch";

interface ControlledSwitchProps<T extends FieldValues> {
  name: Path<T>;
  disabled?: boolean;
}

export function ControlledSwitch<T extends FieldValues>({
  name,
  disabled = false,
}: ControlledSwitchProps<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <Switch value={!!value} onChange={onChange} disabled={disabled} />
      )}
    />
  );
}
