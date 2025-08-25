'use client';

import React, { ReactNode, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { User, AlertCircle, Calendar, CircleDollarSign, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/clients';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Wiederverwendung des OrderData-Typs von der Hauptseite
type OrderData = {
  id: string;
  selectedSubcategory: string;
  customerName: string;
  status: string;
  orderDate?: { _seconds: number; _nanoseconds: number } | string;
  totalAmountPaidByBuyer: number;
  uid: string; // Anbieter-UID (providerId)
  orderedBy: string; // Kunden-UID (customerId)
};

interface OrderSummaryDrawerProps {
  order: OrderData | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  providerName: string;
}

export function OrderSummaryDrawer({
  order,
  isOpen,
  onOpenChange,
  providerName,
}: OrderSummaryDrawerProps) {
  const { user: currentUser } = useAuth();
  const [quickMessage, setQuickMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendQuickMessage = async () => {
    if (!currentUser || !order || !quickMessage.trim()) return;

    setIsSending(true);

    const messagePayload = {
      senderId: currentUser.uid,
      // Use the providerName passed from the parent component, as the AuthContext user
      // is lightweight and does not contain the company name.
      senderName: providerName || 'Anbieter',
      senderType: 'anbieter' as const,
      text: quickMessage.trim(),
      timestamp: serverTimestamp(),
      chatUsers: [order.orderedBy, order.uid], // customerId, providerId
    };

    const lastMessagePayload = {
      text: quickMessage.trim(),
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
      isRead: false,
    };

    try {
      const messagesRef = collection(db, 'auftraege', order.id, 'nachrichten');
      await addDoc(messagesRef, messagePayload);

      const chatDocRef = doc(db, 'chats', order.id);
      await setDoc(
        chatDocRef,
        {
          users: [order.orderedBy, order.uid],
          lastMessage: lastMessagePayload,
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      setQuickMessage('');
      toast.success('Nachricht gesendet!');
    } catch (error) {

      toast.error('Nachricht konnte nicht gesendet werden.');
    } finally {
      setIsSending(false);
    }
  };

  if (!order) {
    return null;
  }

  const formattedPrice = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(order.totalAmountPaidByBuyer / 100);

  const formattedDate = order.orderDate
    ? new Date(
        typeof order.orderDate === 'string' ? order.orderDate : order.orderDate._seconds * 1000
      ).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const DetailItem = ({
    icon,
    label,
    value,
  }: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
  }) => (
    <div className="flex items-start gap-4">
      <div className="text-muted-foreground mt-1">{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full w-full max-w-md ml-auto bg-background">
        <DrawerHeader className="p-6 border-b">
          <DrawerTitle className="text-2xl font-semibold">{order.selectedSubcategory}</DrawerTitle>
          <DrawerDescription>Auftrags-ID: {order.id}</DrawerDescription>
        </DrawerHeader>
        <div className="p-6 space-y-6 overflow-y-auto">
          <DetailItem icon={<User className="size-5" />} label="Kunde" value={order.customerName} />
          <DetailItem
            icon={<AlertCircle className="size-5" />}
            label="Status"
            value={<Badge variant="outline">{order.status.replace(/_/g, ' ')}</Badge>}
          />
          <DetailItem icon={<Calendar className="size-5" />} label="Datum" value={formattedDate} />
          <DetailItem
            icon={<CircleDollarSign className="size-5" />}
            label="Umsatz"
            value={<span className="font-semibold text-lg">{formattedPrice}</span>}
          />

          {/* Quick Chat für aktive Aufträge */}
          {['AKTIV', 'IN BEARBEITUNG'].includes(order.status) && (
            <>
              <div className="border-t -mx-6" />
              <div className="pt-6 space-y-3">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  Schnellnachricht senden
                </h3>
                <Textarea
                  placeholder={`Nachricht an ${order.customerName}...`}
                  value={quickMessage}
                  onChange={e => setQuickMessage(e.target.value)}
                  disabled={isSending}
                  className="bg-white dark:bg-gray-700"
                />
                <Button
                  onClick={handleSendQuickMessage}
                  disabled={isSending || !quickMessage.trim()}
                  className="w-full bg-[#14ad9f] text-white hover:bg-teal-700"
                >
                  {isSending ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Senden
                </Button>
              </div>
            </>
          )}
        </div>
        <DrawerFooter className="mt-auto p-6 border-t bg-background">
          <Button asChild className="bg-[#14ad9f] text-white hover:bg-teal-700">
            <Link href={`/dashboard/company/${order.uid}/orders/${order.id}`}>
              Vollständige Auftragsdetails
            </Link>
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Schließen</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
