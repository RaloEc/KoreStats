import Link from "next/link";

type Categoria = {
  id: string;
  slug: string | null;
  nombre: string | null;
  color?: string | null;
};

type Props = {
  subcategorias: Categoria[];
  currentId?: string;
};

export default function SubcategoriasDestacadas({
  subcategorias,
  currentId,
}: Props) {
  if (!subcategorias || subcategorias.length === 0) return null;
  return (
    <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {subcategorias.map((s) => {
        const href = `/foro/categoria/${s.slug || s.id}`;
        const active = currentId && s.id === currentId;
        return (
          <Link
            key={s.id}
            href={href}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${
              active
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-transparent text-foreground border-border hover:bg-muted dark:hover:bg-gray-800 amoled:hover:bg-gray-900"
            }`}
            style={active && s.color ? { backgroundColor: s.color } : undefined}
          >
            {s.nombre}
          </Link>
        );
      })}
    </div>
  );
}
