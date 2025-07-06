import { getAllOrders } from '@/lib/order-data';
import { OrdersClientPage } from './components/OrdersClientPage';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
    const orders = await getAllOrders();

    return <OrdersClientPage orders={orders} />;
}
