import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-gray-100">
            <div className="w-64 bg-white shadow-md">
                <div className="p-4">
                    <h2 className="text-xl font-bold text-gray-800">Admin Menü</h2>
                </div>
            </div>
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
