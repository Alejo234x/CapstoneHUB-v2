import { ProjectCategory } from "../../services/schemas";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

type ProjectCategoriesPanelProps = {
  categories?: ProjectCategory[];
};

export default function ProjectCategoriesPanel({
  categories,
}: ProjectCategoriesPanelProps) {
  const hasCategories = Boolean(categories && categories.length > 0);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Categorías y etiquetas
      </h2>

      {hasCategories ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories!.map((category) => (
            <Badge
              key={category.id}
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground"
              style={{
                backgroundColor: category.color ?? "#e2e8f0",
              }}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      ) : (
        <Empty className="mt-3 border">
          <EmptyHeader>
            <EmptyTitle>Sin categorías</EmptyTitle>
            <EmptyDescription>
              Este proyecto todavía no tiene categorías o etiquetas asignadas.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
