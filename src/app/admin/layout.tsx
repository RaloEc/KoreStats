import AdminProtection from "@/components/AdminProtection";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // useEffect removed as it was only for logging and prevented Server Component usage
  return (
    <AdminProtection loadingMessage="Cargando panel de administración...">
      <div className="p-4 md:p-6">{children}</div>
    </AdminProtection>
  );
}
