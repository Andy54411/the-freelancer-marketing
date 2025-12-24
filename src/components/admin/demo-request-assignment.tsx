'use client';

import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SupportMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface DemoRequestAssignmentProps {
  requestId: string;
  currentAssignedTo?: string | null;
  onAssigned?: () => void;
}

export function DemoRequestAssignment({ 
  requestId, 
  currentAssignedTo,
  onAssigned 
}: DemoRequestAssignmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(currentAssignedTo || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportMembers, setSupportMembers] = useState<SupportMember[]>([]);

  useEffect(() => {
    // TODO: Support-Mitarbeiter aus Firestore laden
    // Beispiel-Daten für Demonstration
    setSupportMembers([
      { id: '1', name: 'Max Mustermann', email: 'max@taskilo.com', role: 'Support Manager' },
      { id: '2', name: 'Anna Schmidt', email: 'anna@taskilo.com', role: 'Support Agent' },
      { id: '3', name: 'Tom Weber', email: 'tom@taskilo.com', role: 'Support Agent' },
    ]);
  }, []);

  const handleAssign = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/demo-requests/${requestId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: selectedMember }),
      });

      if (!response.ok) throw new Error('Fehler beim Zuweisen');

      setIsOpen(false);
      onAssigned?.();
    } catch (error) {
      console.error('Fehler beim Zuweisen:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
      >
        <Users className="w-4 h-4" />
        {currentAssignedTo ? 'Neu zuweisen' : 'Mitarbeiter zuweisen'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-xl shadow-2xl max-w-md w-full"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Users className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Mitarbeiter zuweisen
                      </h3>
                      <p className="text-sm text-gray-500">
                        Wählen Sie einen Support-Mitarbeiter
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                  {supportMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedMember === member.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-500">{member.role}</div>
                            <div className="text-xs text-gray-400">{member.email}</div>
                          </div>
                        </div>
                        {selectedMember === member.id && (
                          <CheckCircle className="w-5 h-5 text-teal-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-200">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedMember || isSubmitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Wird zugewiesen...
                      </>
                    ) : (
                      'Zuweisen'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
