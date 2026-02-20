import type { Ionicons } from "@expo/vector-icons";
import {
  Controller,
  useFormContext,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { SwitchRow } from "@/components/ui/SwitchRow";

interface ControlledSwitchRowProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function ControlledSwitchRow<T extends FieldValues>({
  name,
  label,
  description,
  disabled = false,
  icon,
}: ControlledSwitchRowProps<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <SwitchRow
          label={label}
          description={description}
          value={!!value}
          onChange={onChange}
          disabled={disabled}
          icon={icon}
        />
      )}
    />
  );
}
