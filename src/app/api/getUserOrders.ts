// src/api/getUserOrders.ts

export const getUserOrders = async (userId: string, idToken: string) => {
    const response = await fetch('http://127.0.0.1:5001/tilvo-f142f/europe-west1/getUserOrders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.orders;
};
