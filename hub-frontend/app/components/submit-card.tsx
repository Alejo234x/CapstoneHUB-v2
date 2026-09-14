import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SubmitCardProps = {
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
};

export default function SubmitCard({
  title,
  description,
  href,
  disabled = false,
}: SubmitCardProps) {
  const card = (
    <Card
      className={cn(
        "mb-6 transition",
        disabled ? "opacity-60" : "hover:bg-muted/50",
      )}
    >
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">{description}</CardContent>
    </Card>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return <div aria-disabled={disabled}>{card}</div>;
}
