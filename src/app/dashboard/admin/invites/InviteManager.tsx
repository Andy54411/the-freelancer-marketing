'use client';

import { useState } from 'react';
import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, PlusCircle, Trash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// --- Typdefinitionen für Cloud Functions ---

// Ein generischer Ergebnistyp für unsere aufrufbaren Funktionen
interface CallableFunctionResult {
  success: boolean;
  message?: string;
}

// Typen für die 'createInviteCode' Funktion
interface CreateInviteData {
  role: 'support' | 'master';
  recipientEmail?: string;
}

interface CreateInviteResult extends CallableFunctionResult {
  inviteCode?: string;
  emailSent?: boolean;
}

// Typen für die 'deleteInviteCode' Funktion
interface DeleteInviteData {
  codeId: string;
}
type DeleteInviteResult = CallableFunctionResult;

// Typdefinition direkt hier, da nicht mehr aus page importiert werden kann
export interface InviteCode {
  id: string;
  code: string;
  role: 'support' | 'master';
  createdAt: Date;
}

interface InviteManagerProps {
  initialCodes: InviteCode[];
}

export default function InviteManager({ initialCodes }: InviteManagerProps) {
  const { user, loading: authLoading } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>(initialCodes);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);

  // State for the dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [roleToCreate, setRoleToCreate] = useState<'support' | 'master'>('support');

  const canCreateInvites = user?.role === 'master' || user?.role === 'support';

  const handleGenerateAndSendCode = async () => {
    if (!canCreateInvites) {
      setError('Sie haben keine Berechtigung, Einladungen zu erstellen.');
      return;
    }

    if (!recipientEmail || !/^\S+@\S+\.\S+$/.test(recipientEmail)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const createInviteCodeCallable = httpsCallable<CreateInviteData, CreateInviteResult>(
        functions,
        'createInviteCode'
      );
      const result: HttpsCallableResult<CreateInviteResult> = await createInviteCodeCallable({
        role: roleToCreate,
        recipientEmail: recipientEmail,
      });

      if (result.data.success && result.data.inviteCode) {
        const newCode: InviteCode = {
          id: result.data.inviteCode,
          code: result.data.inviteCode,
          role: roleToCreate,
          createdAt: new Date(),
        };
        setCodes(prevCodes => [newCode, ...prevCodes]);

        if (result.data.emailSent) {
          setSuccessMessage(
            `Code ${result.data.inviteCode} erfolgreich erstellt und an ${recipientEmail} gesendet.`
          );
        } else {
          setSuccessMessage(
            `Code ${result.data.inviteCode} erfolgreich erstellt. (Es wurde keine E-Mail gesendet, da keine Adresse angegeben wurde.)`
          );
        }
        setIsDialogOpen(false);
        setRecipientEmail('');
        setRoleToCreate('support');
      } else {
        setError(result.data.message || 'Der Einladungscode konnte nicht erstellt werden.');
      }
    } catch (err: any) {
      console.error('Fehler beim Aufrufen der Cloud Function:', err);
      setError(err.message || 'Ein unbekannter Fehler ist aufgetreten.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    setDeletingCodeId(codeId);
    setError(null);
    setSuccessMessage(null);

    try {
      const deleteInviteCodeCallable = httpsCallable<DeleteInviteData, DeleteInviteResult>(
        functions,
        'deleteInviteCode'
      );
      const result = await deleteInviteCodeCallable({ codeId: codeId });

      if (result.data.success) {
        // Entferne den Code aus dem lokalen State nach erfolgreicher Bestätigung vom Server
        setCodes(prevCodes => prevCodes.filter(c => c.id !== codeId));
        setSuccessMessage(result.data.message || `Code erfolgreich gelöscht.`);
      } else {
        // Behandelt den Fall, dass die Funktion einen kontrollierten Fehler zurückgibt
        setError(result.data.message || 'Der Code konnte nicht gelöscht werden.');
      }
    } catch (err: any) {
      console.error('Fehler beim Löschen des Codes:', err);
      // Dieser Block fängt Abstürze wie 'internal' ab
      setError(
        'Ein interner Fehler ist beim Löschen aufgetreten. Bitte überprüfen Sie die Server-Logs.'
      );
    } finally {
      setDeletingCodeId(null);
    }
  };

  if (authLoading) {
    return (
      <Card>
        <CardContent className="p-6">Benutzerdaten werden geladen...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unbenutzte Einladungscodes</CardTitle>
      </CardHeader>
      <CardContent>
        {successMessage && (
          <Alert className="mb-4 border-green-500 text-green-700 dark:border-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Erfolgreich</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Fehler</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Erstellt am</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length > 0 ? (
              codes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.code}</TableCell>
                  <TableCell>
                    <Badge variant={c.role === 'master' ? 'default' : 'secondary'}>{c.role}</Badge>
                  </TableCell>
                  <TableCell>{c.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingCodeId === c.id}
                          title="Löschen"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Diese Aktion kann nicht rückgängig gemacht werden. Der Einladungscode
                            &ldquo;{c.code}&rdquo; wird dauerhaft gelöscht.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCode(c.id)}>
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Keine unbenutzten Einladungscodes gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <Dialog
          open={isDialogOpen}
          onOpenChange={open => {
            setIsDialogOpen(open);
            // Setzt den Dialog-Zustand vollständig zurück, wenn er geschlossen wird.
            if (!open) {
              setError(null);
              setRecipientEmail('');
              setRoleToCreate('support');
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              disabled={!canCreateInvites}
              title={
                !canCreateInvites ? 'Sie haben nicht die erforderliche Rolle (master/support).' : ''
              }
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Neuen Einladungscode senden
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Einladungscode erstellen & senden</DialogTitle>
              <DialogDescription>
                Geben Sie die E-Mail-Adresse des Empfängers und die gewünschte Rolle an. Der Code
                wird direkt versendet.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  E-Mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                  className="col-span-3"
                  placeholder="name@firma.de"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Rolle
                </Label>
                <Select
                  value={roleToCreate}
                  onValueChange={(value: 'support' | 'master') => setRoleToCreate(value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Rolle auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button onClick={handleGenerateAndSendCode} disabled={isLoading}>
                {isLoading ? 'Wird gesendet...' : 'Einladung senden'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
