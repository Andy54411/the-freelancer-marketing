import React from 'react';
import { DashboardCard } from './DashboardCard';
import {
  Loader2 as FiLoader,
  AlertCircle as FiAlertCircle,
  MessageSquare as FiMessageSquare,
  PlusCircle as FiPlusCircle,
} from 'lucide-react';
import { OrderListItem } from '@/types/types';

interface OrdersOverviewCardProps {
  userOrders: OrderListItem[];
  loadingOrders: boolean;
  ordersError: string | null;
  onCreateNewOrder: () => void;
  onViewAllOrders: () => void;
  currentUserId?: string;
}

export const OrdersOverviewCard: React.FC<OrdersOverviewCardProps> = ({
  userOrders,
  loadingOrders,
  ordersError,
  onCreateNewOrder,
  onViewAllOrders,
  currentUserId,
}) => {
  return (
    <DashboardCard>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <span className="w-3 h-3 bg-linear-to-r from-[#14ad9f] to-teal-600 rounded-full mr-3"></span>
          Meine Aufträge
        </h2>
        <div className="px-3 py-1 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white text-sm font-medium rounded-full">
          {userOrders.length} {userOrders.length === 1 ? 'Auftrag' : 'Aufträge'}
        </div>
      </div>

      {loadingOrders ? (
        <div className="flex justify-center items-center py-8">
          <FiLoader className="animate-spin text-4xl text-[#14ad9f]" />
          <span className="ml-3 text-gray-600 text-lg">Lade Aufträge...</span>
        </div>
      ) : ordersError ? (
        <div className="text-center p-6 text-red-600 bg-red-50 rounded-xl border border-red-200">
          <FiAlertCircle className="mx-auto h-8 w-8 mb-3" />
          <p className="font-medium">{ordersError}</p>
        </div>
      ) : userOrders.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-r from-[#14ad9f] to-teal-600 rounded-full flex items-center justify-center">
            <FiMessageSquare className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Noch keine Aufträge</h3>
          <p className="text-gray-500 mb-6 text-sm">
            Erstellen Sie Ihren ersten Auftrag und entdecken Sie die besten Services.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          {userOrders.map(order => (
            <div
              key={order.id}
              className="bg-linear-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-[#14ad9f]/30"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{order.selectedSubcategory}</h3>
                    <span className="text-xs bg-[#14ad9f]/10 text-[#14ad9f] px-2 py-1 rounded-full font-medium">
                      Service
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    Auftrag vom {order.jobDateFrom || 'Datum nicht verfügbar'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Anbieter: {order.providerName}</span>
                    <span>€{(order.totalPriceInCents / 100).toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    {order.status === 'completed'
                      ? 'Abgeschlossen'
                      : order.status === 'in_progress'
                        ? 'In Bearbeitung'
                        : order.status === 'pending'
                          ? 'Ausstehend'
                          : order.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCreateNewOrder}
          className="flex-1 flex items-center justify-center px-4 py-3 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-[#129a8f] hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
        >
          <FiPlusCircle className="mr-2 w-4 h-4" />
          Neuen Auftrag erstellen
        </button>

        {userOrders.length > 0 && (
          <button
            onClick={onViewAllOrders}
            className="flex items-center justify-center px-4 py-3 bg-white border-2 border-[#14ad9f] text-[#14ad9f] rounded-xl hover:bg-[#14ad9f] hover:text-white transition-all duration-300 font-semibold"
          >
            <FiMessageSquare className="mr-2 w-4 h-4" />
            Alle anzeigen
          </button>
        )}
      </div>
    </DashboardCard>
  );
};
