import AdminProtection from "@/components/AdminProtection";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // useEffect removed as it was only for logging and prevented Server Component usage
  return (
    <AdminProtection loadingMessage="Cargando panel de administración...">
      <div className="px-4 pb-4 pt-0 md:px-6 md:pb-6 md:pt-0">{children}</div>
    </AdminProtection>
  );
}
