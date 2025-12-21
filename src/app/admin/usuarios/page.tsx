import AdminProtection from "@/components/AdminProtection";
import AdminUsuariosPageClient from "@/components/admin/usuarios/AdminUsuariosPageClient";

export const metadata = {
  title: "Gestión de Usuarios - Administración | BitArena",
  description: "Administra los usuarios de la comunidad",
};

export default function AdminUsuariosPage() {
  return (
    <AdminProtection>
      <AdminUsuariosPageClient />
    </AdminProtection>
  );
}
