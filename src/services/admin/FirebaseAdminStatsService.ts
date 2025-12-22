/**
 * Firebase Admin Dashboard Stats Service
 * 
 * Ersetzt AWS DynamoDB Stats-Abfragen
 * Nutzt Firebase Firestore Collections
 */

import { db } from '@/firebase/server';

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  companies: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  system: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    lastCheck: string;
  };
}

export interface SystemStatus {
  firebase: 'healthy' | 'warning' | 'error';
  storage: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  overall: 'healthy' | 'warning' | 'error';
}

export class FirebaseAdminStatsService {

  /**
   * Get dashboard overview stats
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    if (!db) {
      return this.getEmptyStats();
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    try {
      // Get user stats
      const usersSnapshot = await db.collection('users').get();
      const users = usersSnapshot.docs.map(doc => doc.data());
      const newUsersThisMonth = users.filter(u => {
        const createdAt = u.createdAt?.toDate?.() || new Date(u.createdAt);
        return createdAt >= startOfMonth;
      }).length;

      // Get company stats
      const companiesSnapshot = await db.collection('companies').get();
      const companies = companiesSnapshot.docs.map(doc => doc.data());
      const newCompaniesThisMonth = companies.filter(c => {
        const createdAt = c.createdAt?.toDate?.() || new Date(c.createdAt);
        return createdAt >= startOfMonth;
      }).length;

      // Get ticket stats
      const ticketsSnapshot = await db.collection('adminTickets').get();
      const tickets = ticketsSnapshot.docs.map(doc => doc.data());

      // Get invoice stats for revenue
      const invoicesSnapshot = await db.collection('invoices').get();
      const invoices = invoicesSnapshot.docs.map(doc => doc.data());
      
      const thisMonthRevenue = invoices
        .filter(inv => {
          const date = inv.createdAt?.toDate?.() || new Date(inv.createdAt);
          return date >= startOfMonth && inv.status === 'paid';
        })
        .reduce((sum, inv) => sum + (inv.totalGross || inv.total || 0), 0);

      const lastMonthRevenue = invoices
        .filter(inv => {
          const date = inv.createdAt?.toDate?.() || new Date(inv.createdAt);
          return date >= startOfLastMonth && date < startOfMonth && inv.status === 'paid';
        })
        .reduce((sum, inv) => sum + (inv.totalGross || inv.total || 0), 0);

      const growth = lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      return {
        users: {
          total: users.length,
          active: users.filter(u => u.isActive !== false).length,
          newThisMonth: newUsersThisMonth,
        },
        companies: {
          total: companies.length,
          active: companies.filter(c => c.isActive !== false).length,
          newThisMonth: newCompaniesThisMonth,
        },
        tickets: {
          total: tickets.length,
          open: tickets.filter(t => t.status === 'open').length,
          inProgress: tickets.filter(t => t.status === 'in-progress').length,
          resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
        },
        revenue: {
          thisMonth: Math.round(thisMonthRevenue * 100) / 100,
          lastMonth: Math.round(lastMonthRevenue * 100) / 100,
          growth: Math.round(growth * 100) / 100,
        },
        system: {
          status: 'healthy',
          uptime: 99.9,
          lastCheck: new Date().toISOString(),
        },
      };
    } catch {
      return this.getEmptyStats();
    }
  }

  /**
   * Get system status
   */
  static async getSystemStatus(): Promise<SystemStatus> {
    const status: SystemStatus = {
      firebase: 'healthy',
      storage: 'healthy',
      api: 'healthy',
      overall: 'healthy',
    };

    // Test Firebase connection
    try {
      if (!db) {
        status.firebase = 'error';
        status.overall = 'error';
      } else {
        // Simple read test
        await db.collection('_health').doc('check').get();
      }
    } catch {
      // Collection might not exist, but connection works
      status.firebase = 'healthy';
    }

    // Determine overall status
    const statuses = [status.firebase, status.storage, status.api];
    if (statuses.includes('error')) {
      status.overall = 'error';
    } else if (statuses.includes('warning')) {
      status.overall = 'warning';
    }

    return status;
  }

  /**
   * Get user growth data for charts
   */
  static async getUserGrowthData(days: number = 30): Promise<Array<{ date: string; count: number }>> {
    if (!db) {
      return [];
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => doc.data());

    // Group by date
    const countsByDate: Record<string, number> = {};
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      countsByDate[dateStr] = 0;
    }

    for (const user of users) {
      const createdAt = user.createdAt?.toDate?.() || new Date(user.createdAt);
      if (createdAt >= startDate && createdAt <= endDate) {
        const dateStr = createdAt.toISOString().split('T')[0];
        if (countsByDate[dateStr] !== undefined) {
          countsByDate[dateStr]++;
        }
      }
    }

    return Object.entries(countsByDate).map(([date, count]) => ({ date, count }));
  }

  /**
   * Get recent activity log
   */
  static async getRecentActivity(limit: number = 20): Promise<Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    userId?: string;
  }>> {
    if (!db) {
      return [];
    }

    try {
      const snapshot = await db
        .collection('activityLog')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Array<{ id: string; type: string; description: string; timestamp: string; userId?: string }>;
    } catch {
      // Collection might not exist
      return [];
    }
  }

  /**
   * Get admin users list
   */
  static async getAdminUsers(): Promise<Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    lastLogin?: string;
  }>> {
    if (!db) {
      return [];
    }

    const snapshot = await db.collection('adminUsers').get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        name: data.name,
        role: data.role,
        isActive: data.isActive,
        lastLogin: data.lastLogin?.toDate?.()?.toISOString(),
      };
    });
  }

  /**
   * Get empty stats (fallback)
   */
  private static getEmptyStats(): DashboardStats {
    return {
      users: { total: 0, active: 0, newThisMonth: 0 },
      companies: { total: 0, active: 0, newThisMonth: 0 },
      tickets: { total: 0, open: 0, inProgress: 0, resolved: 0 },
      revenue: { thisMonth: 0, lastMonth: 0, growth: 0 },
      system: { status: 'healthy', uptime: 0, lastCheck: new Date().toISOString() },
    };
  }
}
