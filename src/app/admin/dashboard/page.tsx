import AdminProtection from "@/components/AdminProtection";
import DashboardContent from "@/components/admin/DashboardContent";

export const metadata = {
  title: "Dashboard - Administración | KoreStats",
  description: "Panel de control general de la comunidad",
};

export default function AdminDashboardPage() {
  return (
    <AdminProtection>
      <DashboardContent />
    </AdminProtection>
  );
}
