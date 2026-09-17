import { Badge } from "@/components/ui/badge";
import { RiStackLine } from "@remixicon/react";
import { formatProjectSource } from "@/app/services/utils";

type ProjectSourceBadgeProps = {
  source?: string;
};

export default function ProjectSourceBadge({ source }: ProjectSourceBadgeProps) {
  if (!source) {
    return null;
  }

  return (
    <Badge variant="secondary">
      <RiStackLine data-icon="inline-start" />
      {formatProjectSource(source)}
    </Badge>
  );
}
