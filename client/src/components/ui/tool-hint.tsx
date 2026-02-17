import { IconInfoCircle } from "@tabler/icons-react";

interface ToolHintProps {
  hint: string;
}

export function ToolHint({ hint }: ToolHintProps) {
  return (
    <div className="flex flex-row gap-1 text-sm items-center">
      <IconInfoCircle stroke={1} size={16} /> <span className="text-text-primary">{hint}</span>
    </div>
  );
};