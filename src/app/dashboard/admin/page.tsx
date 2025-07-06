import { getAllCompanies } from '@/lib/company-data';
import { getAllOrders } from '@/lib/order-data';
import { getAllChats } from '@/lib/chat-data';
import { getSupportTickets } from '@/lib/support-data';
import Link from 'next/link';

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const companies = await getAllCompanies();
    const orders = await getAllOrders();
    const chats = await getAllChats();
    const supportTickets = await getSupportTickets();

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Willkommen im Admin-Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/dashboard/admin/companies">
                    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <h2 className="text-xl font-bold text-gray-800">Firmen</h2>
                        <p className="text-gray-600 mt-2">{companies.length} Firmen registriert</p>
                    </div>
                </Link>
                <Link href="/dashboard/admin/orders">
                    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <h2 className="text-xl font-bold text-gray-800">Aufträge</h2>
                        <p className="text-gray-600 mt-2">{orders.length} Aufträge erstellt</p>
                    </div>
                </Link>
                <Link href="/dashboard/admin/chats">
                    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <h2 className="text-xl font-bold text-gray-800">Chats</h2>
                        <p className="text-gray-600 mt-2">{chats.length} Nachrichten gesendet</p>
                    </div>
                </Link>
                <Link href="/dashboard/admin/support">
                    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <h2 className="text-xl font-bold text-gray-800">Support</h2>
                        <p className="text-gray-600 mt-2">{supportTickets.length} offene Tickets</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}