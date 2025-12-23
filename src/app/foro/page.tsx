import ForoCliente from "@/components/foro/ForoCliente";
import ForoSidebar from "@/components/foro/ForoSidebar";
import { getCategoriasJerarquicas } from "@/lib/foro/server-actions";

export default async function ForoPage() {
  const categorias = await getCategoriasJerarquicas();

  return <ForoCliente initialCategorias={categorias} />;
}
