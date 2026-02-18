import { Button } from "@/components/ui/Button";

interface SubmitButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SubmitButton({
  title,
  onPress,
  isLoading = false,
  disabled = false,
}: SubmitButtonProps) {
  return (
    <Button
      title={title}
      onPress={onPress}
      isLoading={isLoading}
      disabled={disabled}
      variant="primary"
      style={{ marginTop: 24 }}
    />
  );
}
