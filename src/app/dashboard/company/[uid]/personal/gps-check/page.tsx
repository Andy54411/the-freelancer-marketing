'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  MapPin,
  Clock,
  Play,
  Square,
  Camera,
  Smartphone,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  RefreshCw,
  Navigation,
  Shield,
  Eye,
  Map,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'react-hot-toast';
import { PersonalService, Employee, TimeEntry } from '@/services/personalService';
import { collection, getDocs, doc, addDoc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';

// Check-In Methoden
type CheckMethod = 'APP' | 'TERMINAL' | 'WEB' | 'QR';

// GPS Status
type LocationStatus = 'INSIDE' | 'OUTSIDE' | 'UNKNOWN' | 'DISABLED';

// Check-In Eintrag
interface CheckInRecord {
  id: string;
  employeeId: string;
  employee?: Employee;
  
  // Check-In/Out
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  
  // GPS-Daten
  checkInLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  };
  checkOutLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
    address?: string;
  };
  locationStatus: LocationStatus;
  
  // Methode
  method: CheckMethod;
  deviceInfo?: string;
  
  // Foto (optional)
  photoUrl?: string;
  
  // PIN (optional)
  pinVerified?: boolean;
  
  // Status
  isActive: boolean;
  duration?: number; // In Minuten
  
  // Flags
  hasGpsAnomaly?: boolean;
  manuallyEdited?: boolean;
  
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Standort-Konfiguration
interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius: number; // in Metern
  isActive: boolean;
}

export default function GpsCheckPage() {
  const params = useParams();
  const companyId = params.uid as string;

  // State
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('live');

  // Settings
  const [settings, setSettings] = useState({
    requireGps: true,
    requirePhoto: false,
    requirePin: false,
    allowRemoteCheckIn: false,
    gpsRadius: 100, // Meter
    autoBreakDeduction: true,
    breakThreshold: 360, // 6 Stunden
  });

  // Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInRecord | null>(null);

  // Neuer Standort Form
  const [newLocation, setNewLocation] = useState<Partial<Location>>({
    name: '',
    address: '',
    lat: 0,
    lng: 0,
    radius: 100,
    isActive: true,
  });

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Mitarbeiter laden
      const employeeList = await PersonalService.getEmployees(companyId);
      const activeEmployees = employeeList.filter(emp => emp.isActive);
      setEmployees(activeEmployees);

      // Check-Ins laden
      const checkInRef = collection(db, 'companies', companyId, 'checkIns');
      const checkInSnapshot = await getDocs(checkInRef);
      
      const records = checkInSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CheckInRecord[];

      // Mitarbeiterdaten hinzufügen
      const recordsWithEmployees = records.map(record => ({
        ...record,
        employee: activeEmployees.find(e => e.id === record.employeeId),
      }));

      // Nach Zeit sortieren
      recordsWithEmployees.sort((a, b) => 
        b.checkInTime?.toMillis() - a.checkInTime?.toMillis()
      );

      setCheckIns(recordsWithEmployees);

      // Standorte laden
      const locationRef = collection(db, 'companies', companyId, 'workLocations');
      const locationSnapshot = await getDocs(locationRef);
      
      const locs = locationSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Location[];

      setLocations(locs);

    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Standort hinzufügen
  const addLocation = async () => {
    if (!newLocation.name || !newLocation.address) {
      toast.error('Bitte Name und Adresse eingeben');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'companies', companyId, 'workLocations'), {
        ...newLocation,
        createdAt: Timestamp.now(),
      });

      setLocations(prev => [...prev, { id: docRef.id, ...newLocation } as Location]);
      setShowLocationModal(false);
      setNewLocation({
        name: '',
        address: '',
        lat: 0,
        lng: 0,
        radius: 100,
        isActive: true,
      });

      toast.success('Standort hinzugefügt');

    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
    }
  };

  // GPS-Status Badge
  const getLocationBadge = (status: LocationStatus) => {
    switch (status) {
      case 'INSIDE':
        return <Badge className="bg-green-100 text-green-700"><MapPin className="w-3 h-3 mr-1" /> Im Bereich</Badge>;
      case 'OUTSIDE':
        return <Badge variant="destructive"><MapPin className="w-3 h-3 mr-1" /> Außerhalb</Badge>;
      case 'UNKNOWN':
        return <Badge variant="outline" className="text-gray-600"><AlertTriangle className="w-3 h-3 mr-1" /> Unbekannt</Badge>;
      case 'DISABLED':
        return <Badge variant="secondary"><WifiOff className="w-3 h-3 mr-1" /> GPS deaktiviert</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Methode Badge
  const getMethodBadge = (method: CheckMethod) => {
    switch (method) {
      case 'APP':
        return <Badge variant="outline"><Smartphone className="w-3 h-3 mr-1" /> App</Badge>;
      case 'TERMINAL':
        return <Badge variant="outline"><Settings className="w-3 h-3 mr-1" /> Terminal</Badge>;
      case 'WEB':
        return <Badge variant="outline"><Wifi className="w-3 h-3 mr-1" /> Web</Badge>;
      case 'QR':
        return <Badge variant="outline"><Camera className="w-3 h-3 mr-1" /> QR-Code</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  // Dauer formatieren
  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')} h`;
  };

  // Zeit formatieren
  const formatTime = (timestamp?: Timestamp) => {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Aktive Check-Ins
  const activeCheckIns = checkIns.filter(c => c.isActive);
  
  // Heutige Check-Ins
  const todayCheckIns = checkIns.filter(c => {
    if (!c.checkInTime) return false;
    const checkInDate = c.checkInTime.toDate();
    const today = new Date();
    return checkInDate.toDateString() === today.toDateString();
  });

  // Statistiken
  const stats = {
    activeNow: activeCheckIns.length,
    totalToday: todayCheckIns.length,
    avgDuration: todayCheckIns.reduce((sum, c) => sum + (c.duration || 0), 0) / Math.max(todayCheckIns.length, 1),
    gpsAnomalies: todayCheckIns.filter(c => c.hasGpsAnomaly).length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GPS-Zeiterfassung</h1>
          <p className="text-gray-500">
            Stempeluhr mit GPS-Verifizierung und Standortkontrolle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowLocationModal(true)}>
            <MapPin className="w-4 h-4 mr-2" />
            Standort hinzufügen
          </Button>
          <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Einstellungen
          </Button>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Users className="w-5 h-5 text-green-500" />
                {stats.activeNow > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Aktuell aktiv</p>
                <p className="text-lg font-semibold">{stats.activeNow}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Check-Ins heute</p>
                <p className="text-lg font-semibold">{stats.totalToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Ø Arbeitszeit</p>
                <p className="text-lg font-semibold">{formatDuration(Math.round(stats.avgDuration))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500">GPS-Anomalien</p>
                <p className="text-lg font-semibold">{stats.gpsAnomalies}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">Live-Übersicht</TabsTrigger>
          <TabsTrigger value="history">Verlauf</TabsTrigger>
          <TabsTrigger value="locations">Standorte</TabsTrigger>
        </TabsList>

        {/* Live Tab */}
        <TabsContent value="live">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Aktive Mitarbeiter
              </CardTitle>
              <CardDescription>
                Mitarbeiter, die derzeit eingestempelt sind
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeCheckIns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Keine aktiven Check-Ins
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeCheckIns.map(checkIn => (
                    <div 
                      key={checkIn.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCheckIn(checkIn);
                        setShowDetailModal(true);
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar>
                          <AvatarImage src={checkIn.employee?.avatar} />
                          <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f]">
                            {checkIn.employee?.firstName?.[0]}{checkIn.employee?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {checkIn.employee?.firstName} {checkIn.employee?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{checkIn.employee?.position}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Check-In:</span>
                          <span className="font-medium">{formatTime(checkIn.checkInTime)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Dauer:</span>
                          <span className="font-medium">
                            {checkIn.checkInTime && formatDuration(
                              Math.round((Date.now() - checkIn.checkInTime.toMillis()) / 60000)
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {getLocationBadge(checkIn.locationStatus)}
                          {getMethodBadge(checkIn.method)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verlauf Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Check-In</TableHead>
                      <TableHead>Check-Out</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead>Standort</TableHead>
                      <TableHead>Methode</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkIns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          Keine Einträge vorhanden
                        </TableCell>
                      </TableRow>
                    ) : (
                      checkIns.slice(0, 20).map(checkIn => (
                        <TableRow key={checkIn.id} className={checkIn.hasGpsAnomaly ? 'bg-orange-50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={checkIn.employee?.avatar} />
                                <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f] text-xs">
                                  {checkIn.employee?.firstName?.[0]}{checkIn.employee?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">
                                {checkIn.employee?.firstName} {checkIn.employee?.lastName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {checkIn.checkInTime?.toDate().toLocaleDateString('de-DE')}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {formatTime(checkIn.checkInTime)}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {checkIn.isActive ? (
                              <Badge className="bg-green-100 text-green-700">Aktiv</Badge>
                            ) : (
                              formatTime(checkIn.checkOutTime)
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDuration(checkIn.duration)}
                          </TableCell>
                          <TableCell>
                            {getLocationBadge(checkIn.locationStatus)}
                          </TableCell>
                          <TableCell>
                            {getMethodBadge(checkIn.method)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedCheckIn(checkIn);
                                setShowDetailModal(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Standorte Tab */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>Arbeitsstandorte</CardTitle>
              <CardDescription>
                Definieren Sie Geofence-Bereiche für die GPS-Verifizierung
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Keine Standorte konfiguriert</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowLocationModal(true)}
                  >
                    Standort hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map(location => (
                    <div key={location.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            location.isActive ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <MapPin className={`w-4 h-4 ${
                              location.isActive ? 'text-green-600' : 'text-gray-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{location.name}</p>
                            <p className="text-xs text-gray-500">{location.address}</p>
                          </div>
                        </div>
                        <Badge variant={location.isActive ? 'default' : 'secondary'}>
                          {location.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {location.radius}m Radius
                        </span>
                        <span className="flex items-center gap-1">
                          <Map className="w-3 h-3" />
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Standort hinzufügen Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Standort hinzufügen</DialogTitle>
            <DialogDescription>
              Definieren Sie einen neuen Arbeitsstandort für die GPS-Verifizierung
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newLocation.name || ''}
                onChange={e => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Hauptbüro München"
              />
            </div>

            <div>
              <Label>Adresse</Label>
              <Input
                value={newLocation.address || ''}
                onChange={e => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                placeholder="z.B. Musterstraße 1, 80331 München"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Breitengrad (Lat)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={newLocation.lat || ''}
                  onChange={e => setNewLocation(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                  placeholder="48.1371"
                />
              </div>
              <div>
                <Label>Längengrad (Lng)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={newLocation.lng || ''}
                  onChange={e => setNewLocation(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                  placeholder="11.5754"
                />
              </div>
            </div>

            <div>
              <Label>Radius (Meter): {newLocation.radius}m</Label>
              <Slider
                value={[newLocation.radius || 100]}
                onValueChange={v => setNewLocation(prev => ({ ...prev, radius: v[0] }))}
                min={25}
                max={500}
                step={25}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Mitarbeiter müssen sich innerhalb dieses Radius befinden
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label>Standort aktiv</Label>
              <Switch
                checked={newLocation.isActive}
                onCheckedChange={v => setNewLocation(prev => ({ ...prev, isActive: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLocationModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={addLocation}>
              Standort speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Einstellungen Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>GPS-Zeiterfassung Einstellungen</DialogTitle>
            <DialogDescription>
              Konfigurieren Sie die Stempeluhr-Einstellungen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>GPS-Verifizierung erforderlich</Label>
                <p className="text-xs text-gray-500">Mitarbeiter müssen GPS aktiviert haben</p>
              </div>
              <Switch
                checked={settings.requireGps}
                onCheckedChange={v => setSettings(prev => ({ ...prev, requireGps: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Foto bei Check-In erforderlich</Label>
                <p className="text-xs text-gray-500">Selfie als Identitätsnachweis</p>
              </div>
              <Switch
                checked={settings.requirePhoto}
                onCheckedChange={v => setSettings(prev => ({ ...prev, requirePhoto: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>PIN-Eingabe erforderlich</Label>
                <p className="text-xs text-gray-500">Persönliche PIN zur Verifizierung</p>
              </div>
              <Switch
                checked={settings.requirePin}
                onCheckedChange={v => setSettings(prev => ({ ...prev, requirePin: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Remote Check-In erlauben</Label>
                <p className="text-xs text-gray-500">Check-In außerhalb definierter Standorte</p>
              </div>
              <Switch
                checked={settings.allowRemoteCheckIn}
                onCheckedChange={v => setSettings(prev => ({ ...prev, allowRemoteCheckIn: v }))}
              />
            </div>

            <div>
              <Label>Standard GPS-Radius: {settings.gpsRadius}m</Label>
              <Slider
                value={[settings.gpsRadius]}
                onValueChange={v => setSettings(prev => ({ ...prev, gpsRadius: v[0] }))}
                min={25}
                max={500}
                step={25}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Automatische Pausenabzug</Label>
                <p className="text-xs text-gray-500">Nach {settings.breakThreshold / 60} Stunden Arbeitszeit</p>
              </div>
              <Switch
                checked={settings.autoBreakDeduction}
                onCheckedChange={v => setSettings(prev => ({ ...prev, autoBreakDeduction: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => {
              toast.success('Einstellungen gespeichert');
              setShowSettingsModal(false);
            }}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Check-In Details</DialogTitle>
          </DialogHeader>

          {selectedCheckIn && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Avatar>
                  <AvatarImage src={selectedCheckIn.employee?.avatar} />
                  <AvatarFallback className="bg-[#14ad9f]/10 text-[#14ad9f]">
                    {selectedCheckIn.employee?.firstName?.[0]}{selectedCheckIn.employee?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedCheckIn.employee?.firstName} {selectedCheckIn.employee?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{selectedCheckIn.employee?.position}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Check-In</Label>
                  <p className="font-medium">{formatTime(selectedCheckIn.checkInTime)}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Check-Out</Label>
                  <p className="font-medium">
                    {selectedCheckIn.isActive ? 'Aktiv' : formatTime(selectedCheckIn.checkOutTime)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Dauer</Label>
                  <p className="font-medium">{formatDuration(selectedCheckIn.duration)}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Methode</Label>
                  <div className="mt-1">{getMethodBadge(selectedCheckIn.method)}</div>
                </div>
              </div>

              {selectedCheckIn.checkInLocation && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <Label className="text-gray-500 text-xs block mb-2">GPS-Standort (Check-In)</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {selectedCheckIn.checkInLocation.address || 
                       `${selectedCheckIn.checkInLocation.lat.toFixed(6)}, ${selectedCheckIn.checkInLocation.lng.toFixed(6)}`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Genauigkeit: ±{selectedCheckIn.checkInLocation.accuracy}m
                  </p>
                </div>
              )}

              {selectedCheckIn.hasGpsAnomaly && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">GPS-Anomalie erkannt</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    Der Check-In-Standort weicht vom definierten Arbeitsort ab.
                  </p>
                </div>
              )}

              {selectedCheckIn.photoUrl && (
                <div>
                  <Label className="text-gray-500 text-xs block mb-2">Check-In Foto</Label>
                  <img 
                    src={selectedCheckIn.photoUrl} 
                    alt="Check-In Foto"
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
