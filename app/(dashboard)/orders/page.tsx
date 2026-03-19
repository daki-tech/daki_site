import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { getUserOrders } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  completed: "secondary",
  shipped: "default",
  confirmed: "outline",
  draft: "outline",
  cancelled: "outline",
};

export default async function OrdersPage() {
  const { user } = await requireUser();
  const orders = await getUserOrders(user.id);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">История заказов</h1>
        <p className="text-muted-foreground">Всі ваші замовлення.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Заказы</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">У вас пока нет заказов.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Позиции</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{format(new Date(order.created_at), "dd.MM.yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[order.status] ?? "outline"}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {(order.order_items ?? []).map((item) => (
                          <p key={item.id}>
                            {item.catalog_models?.sku ?? item.model_id} / {item.size_label}: {item.quantity} шт
                          </p>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
