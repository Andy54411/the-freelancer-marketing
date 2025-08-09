'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bug, Loader2 } from 'lucide-react';

interface CompanyDebugDialogProps {
  companyId: string;
  companyName?: string;
}

export function CompanyDebugDialog({ companyId, companyName }: CompanyDebugDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDebugAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/companies/${companyId}/debug`);
      const result = await response.json();

      if (result.success) {
        setDebugData(result.debug);
      } else {
        setError(result.error || 'Debug analysis failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !debugData) {
      runDebugAnalysis();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bug className="w-4 h-4 mr-2" />
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Company Debug Analysis</DialogTitle>
          <DialogDescription>Detailed analysis for {companyName || companyId}</DialogDescription>
        </DialogHeader>

        <div className="h-[60vh] w-full overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Analyzing company data...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {debugData && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    Company ID: <code>{debugData.id}</code>
                  </div>
                  <div>Timestamp: {new Date(debugData.timestamp).toLocaleString()}</div>
                  <div>
                    User Exists:{' '}
                    <Badge variant={debugData.userExists ? 'default' : 'destructive'}>
                      {debugData.userExists ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>
                    Company Exists:{' '}
                    <Badge variant={debugData.companyExists ? 'default' : 'destructive'}>
                      {debugData.companyExists ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div>Orders: {debugData.ordersCount}</div>
                  <div>Invoices: {debugData.invoicesCount}</div>
                </div>
              </div>

              {/* User Data */}
              {debugData.userExists && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">User Data Analysis</h3>
                  <div className="space-y-2">
                    <div>
                      <strong>Fields ({debugData.userData.length}):</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {debugData.userData.map((field: string) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {debugData.userProblematicFields &&
                      debugData.userProblematicFields.length > 0 && (
                        <div>
                          <strong>Problematic Fields:</strong>
                          <div className="space-y-1 mt-1">
                            {debugData.userProblematicFields.map((issue: string, index: number) => (
                              <Badge
                                key={index}
                                variant="destructive"
                                className="text-xs block w-fit"
                              >
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {debugData.userDataTypes && (
                      <div>
                        <strong>Data Types:</strong>
                        <div className="text-xs mt-1 font-mono bg-white p-2 rounded border max-h-32 overflow-y-auto">
                          {JSON.stringify(debugData.userDataTypes, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Company Data */}
              {debugData.companyExists && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Company Data Analysis</h3>
                  <div className="space-y-2">
                    <div>
                      <strong>Fields ({debugData.companyData.length}):</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {debugData.companyData.map((field: string) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {debugData.companyProblematicFields &&
                      debugData.companyProblematicFields.length > 0 && (
                        <div>
                          <strong>Problematic Fields:</strong>
                          <div className="space-y-1 mt-1">
                            {debugData.companyProblematicFields.map(
                              (issue: string, index: number) => (
                                <Badge
                                  key={index}
                                  variant="destructive"
                                  className="text-xs block w-fit"
                                >
                                  {issue}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {debugData.companyDataTypes && (
                      <div>
                        <strong>Data Types:</strong>
                        <div className="text-xs mt-1 font-mono bg-white p-2 rounded border max-h-32 overflow-y-auto">
                          {JSON.stringify(debugData.companyDataTypes, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Refresh Button */}
              <div className="flex justify-center pt-4">
                <Button onClick={runDebugAnalysis} disabled={loading} variant="outline">
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Refresh Analysis
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
