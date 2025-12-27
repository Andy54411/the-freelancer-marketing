'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  HardDrive, 
  Users, 
  FolderOpen, 
  FileText,
  RefreshCw,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface DriveStats {
  totalUsers: number;
  totalFiles: number;
  totalFolders: number;
  totalStorageUsed: number;
  planDistribution: {
    free: number;
    plus: number;
    pro: number;
  };
}

interface DriveUser {
  id: string;
  plan: 'free' | 'plus' | 'pro';
  storageUsed: number;
  storageLimit: number;
  fileCount: number;
  folderCount: number;
  createdAt: number;
  updatedAt: number;
}

const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const planColors = {
  free: 'bg-gray-100 text-gray-800',
  plus: 'bg-blue-100 text-blue-800',
  pro: 'bg-purple-100 text-purple-800',
};

export default function AdminDrivePage() {
  const [stats, setStats] = useState<DriveStats | null>(null);
  const [users, setUsers] = useState<DriveUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/webmail/drive/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error('Fehler beim Laden der Statistiken');
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/webmail/drive/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handlePlanChange = async (userId: string, newPlan: string) => {
    try {
      const response = await fetch(`/api/webmail/drive/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Plan aktualisiert');
        loadUsers();
        loadStats();
      } else {
        toast.error(data.error);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error('Fehler beim Aktualisieren des Plans');
    }
  };

  const handleCleanup = async () => {
    try {
      const response = await fetch('/api/webmail/drive/admin/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysOld: 30 }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Bereinigt: ${data.deletedFiles} Dateien, ${data.deletedFolders} Ordner, ${formatBytes(data.freedSpace)} freigegeben`);
        loadStats();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error('Fehler bei der Bereinigung');
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadStats(), loadUsers()]);
      setIsLoading(false);
    };
    init();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Taskilo Drive</h1>
          <p className="text-gray-500">Cloud-Speicher Verwaltung</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadStats(); loadUsers(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button variant="destructive" onClick={handleCleanup}>
            <Trash2 className="h-4 w-4 mr-2" />
            Papierkorb bereinigen
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtspeicher</CardTitle>
            <HardDrive className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(stats?.totalStorageUsed || 0)}</div>
            <p className="text-xs text-gray-500">von allen Nutzern verwendet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Nutzer</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-gray-500">
              Free: {stats?.planDistribution.free || 0} | Plus: {stats?.planDistribution.plus || 0} | Pro: {stats?.planDistribution.pro || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dateien</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFiles || 0}</div>
            <p className="text-xs text-gray-500">hochgeladene Dateien</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordner</CardTitle>
            <FolderOpen className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFolders || 0}</div>
            <p className="text-xs text-gray-500">erstellte Ordner</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Plan-Verteilung
          </CardTitle>
          <CardDescription>Uebersicht der aktiven Abonnements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">Free (15 GB)</div>
              <Progress 
                value={stats ? (stats.planDistribution.free / Math.max(stats.totalUsers, 1)) * 100 : 0} 
                className="flex-1" 
              />
              <div className="w-12 text-sm text-right">{stats?.planDistribution.free || 0}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">Plus (50 GB)</div>
              <Progress 
                value={stats ? (stats.planDistribution.plus / Math.max(stats.totalUsers, 1)) * 100 : 0} 
                className="flex-1 [&>div]:bg-blue-500" 
              />
              <div className="w-12 text-sm text-right">{stats?.planDistribution.plus || 0}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">Pro (100 GB)</div>
              <Progress 
                value={stats ? (stats.planDistribution.pro / Math.max(stats.totalUsers, 1)) * 100 : 0} 
                className="flex-1 [&>div]:bg-purple-500" 
              />
              <div className="w-12 text-sm text-right">{stats?.planDistribution.pro || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Drive-Nutzer</CardTitle>
          <CardDescription>Alle Benutzer mit Cloud-Speicher</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Noch keine Drive-Nutzer vorhanden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Speicher</TableHead>
                  <TableHead>Dateien</TableHead>
                  <TableHead>Ordner</TableHead>
                  <TableHead>Registriert</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.id}</TableCell>
                    <TableCell>
                      <Badge className={planColors[user.plan]}>
                        {user.plan.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">
                          {formatBytes(user.storageUsed)} / {formatBytes(user.storageLimit)}
                        </span>
                        <Progress 
                          value={(user.storageUsed / user.storageLimit) * 100} 
                          className="h-1 w-24"
                        />
                      </div>
                    </TableCell>
                    <TableCell>{user.fileCount}</TableCell>
                    <TableCell>{user.folderCount}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.plan}
                        onValueChange={(value) => handlePlanChange(user.id, value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="plus">Plus</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
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
