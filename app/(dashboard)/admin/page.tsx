import { AdminPanel } from "@/components/admin/admin-panel";
import { requireAdmin } from "@/lib/auth";
import { getAdminModels, getAdminOrders, getAdminStats, getAdminUsers } from "@/lib/data";

export default async function AdminPage() {
  await requireAdmin();

  const [models, orders, stats, users] = await Promise.all([
    getAdminModels(),
    getAdminOrders(),
    getAdminStats(),
    getAdminUsers(),
  ]);

  return <AdminPanel initialModels={models} orders={orders} stats={stats} users={users} />;
}
