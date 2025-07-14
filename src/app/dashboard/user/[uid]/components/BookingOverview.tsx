'use client';

export const BookingOverview = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold">Deine Buchungen</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        Du hast derzeit keine aktiven Buchungen.
      </p>
    </div>
  );
};
