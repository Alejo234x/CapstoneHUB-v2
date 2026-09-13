import { ProjectCategory } from "../../services/schemas";

type ProjectCategoriesPanelProps = {
  categories?: ProjectCategory[];
};

export default function ProjectCategoriesPanel({
  categories,
}: ProjectCategoriesPanelProps) {
  const hasCategories = Boolean(categories && categories.length > 0);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
        Categorías y etiquetas
      </h2>

      {hasCategories ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories!.map((category) => (
            <span
              key={category.id}
              className="inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-800"
              style={{
                backgroundColor: category.color ?? "#e2e8f0",
              }}
            >
              {category.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          Este proyecto todavía no tiene categorías o etiquetas asignadas.
        </p>
      )}
    </section>
  );
}
