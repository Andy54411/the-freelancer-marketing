'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiInfo, FiX } from 'react-icons/fi';

interface AlertData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  autoClose?: number; // in milliseconds
}

interface AlertContextType {
  showAlert: (alert: Omit<AlertData, 'id'>) => void;
  hideAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const showAlert = (alertData: Omit<AlertData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newAlert: AlertData = { ...alertData, id };

    setAlerts(prev => [...prev, newAlert]);

    // Auto-close alert if specified
    if (alertData.autoClose) {
      setTimeout(() => {
        hideAlert(id);
      }, alertData.autoClose);
    } else if (alertData.type === 'success') {
      // Auto-close success alerts after 5 seconds
      setTimeout(() => {
        hideAlert(id);
      }, 5000);
    }
  };

  const hideAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const getAlertIcon = (type: AlertData['type']) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="text-green-600" size={20} />;
      case 'error':
        return <FiXCircle className="text-red-600" size={20} />;
      case 'warning':
        return <FiAlertTriangle className="text-yellow-600" size={20} />;
      case 'info':
      default:
        return <FiInfo className="text-blue-600" size={20} />;
    }
  };

  const getAlertColors = (type: AlertData['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}

      {/* Alert Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border shadow-lg transform transition-all duration-300 ease-in-out ${getAlertColors(alert.type)}`}
            style={{
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0">{getAlertIcon(alert.type)}</div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold mb-1">{alert.title}</h4>
                {alert.message && <p className="text-sm opacity-90">{alert.message}</p>}
              </div>

              <button
                onClick={() => hideAlert(alert.id)}
                className="shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </AlertContext.Provider>
  );
};

// Helper functions for common alert types
export const useAlertHelpers = () => {
  const { showAlert } = useAlert();

  return {
    showSuccess: (title: string, message?: string) =>
      showAlert({ type: 'success', title, message, autoClose: 5000 }),

    showError: (title: string, message?: string) => showAlert({ type: 'error', title, message }),

    showWarning: (title: string, message?: string) =>
      showAlert({ type: 'warning', title, message }),

    showInfo: (title: string, message?: string) =>
      showAlert({ type: 'info', title, message, autoClose: 7000 }),
  };
};
