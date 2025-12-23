import Link from "next/link";

type Categoria = {
  id: string;
  slug: string | null;
  nombre: string | null;
  descripcion: string | null;
  color?: string | null;
  nivel?: number | null;
  parent_id?: string | null;
};

type Props = {
  categoria: Categoria;
};

export default function CategoriaHeader({ categoria }: Props) {
  return (
    <header className="space-y-4">
      <nav className="text-sm text-muted-foreground" aria-label="breadcrumb">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/foro" className="hover:underline">
              Foros
            </Link>
          </li>
          <li aria-hidden className="px-1">
            /
          </li>
          <li className="text-foreground font-medium">
            {categoria.nombre || "Categoría"}
          </li>
        </ol>
      </nav>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
            {categoria.nombre}
          </h1>
          {categoria.descripcion && (
            <p className="mt-2 text-base text-muted-foreground max-w-3xl">
              {categoria.descripcion}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
