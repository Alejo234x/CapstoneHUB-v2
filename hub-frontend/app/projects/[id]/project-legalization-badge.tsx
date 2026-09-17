import { Badge } from "@/components/ui/badge";
import { RiScales3Line } from "@remixicon/react";

type ProjectLegalizationBadgeProps = {
  requiresLegalization?: boolean;
};

export default function ProjectLegalizationBadge({
  requiresLegalization,
}: ProjectLegalizationBadgeProps) {
  if (!requiresLegalization) {
    return null;
  }

  return (
    <Badge>
      <RiScales3Line data-icon="inline-start" />
      Requiere legalización
    </Badge>
  );
}
