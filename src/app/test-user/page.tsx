'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function TestUserPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <div>Not authenticated</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Current User Info</h1>
            <div className="bg-gray-100 p-4 rounded">
                <p><strong>UID:</strong> {user.uid}</p>
                <p><strong>Email:</strong> {user.email}</p>
            </div>
        </div>
    );
}
