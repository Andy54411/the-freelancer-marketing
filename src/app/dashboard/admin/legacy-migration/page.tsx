'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  migrateLegacyCompanies, 
  migrateSingleCompany, 
  runMigrationFromAdmin 
} from '@/lib/legacy-migration';

export default function LegacyMigrationTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string>('');
  const [singleTestResult, setSingleTestResult] = useState<any>(null);

  const handleFullMigration = async () => {
    setIsRunning(true);
    setResult('Starting full migration...');
    
    try {
      const migrationResult = await runMigrationFromAdmin();
      setResult(migrationResult);
    } catch (error) {
      setResult(`Migration failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestSingleCompany = async () => {
    setIsRunning(true);
    setSingleTestResult(null);
    
    try {
      // Test with real "Mietkoch Andy" data
      const testResult = await migrateSingleCompany("0Rj5vGkBjeXrzZKBr4cFfV0jRuw1");
      setSingleTestResult(testResult);
    } catch (error) {
      setSingleTestResult({ error: `Test failed: ${error}` });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Legacy Company Migration</h1>
        <p className="text-gray-600 mt-2">
          Migrate existing companies to the new onboarding system. This will analyze existing company data 
          and create appropriate onboarding progress documents.
        </p>
      </div>

      {/* Test Single Company */}
      <Card>
        <CardHeader>
          <CardTitle>Test Single Company Migration</CardTitle>
          <CardDescription>
            Test the migration logic with &quot;Mietkoch Andy&quot; example data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleTestSingleCompany}
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? 'Testing...' : 'Test Migration (Mietkoch Andy)'}
          </Button>
          
          {singleTestResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Test Result:</h3>
              {singleTestResult.error ? (
                <div className="text-red-600">{singleTestResult.error}</div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div><strong>Status:</strong> <Badge className={
                    singleTestResult.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }>{singleTestResult.status}</Badge></div>
                  <div><strong>Completion:</strong> {singleTestResult.completionPercentage}%</div>
                  <div><strong>Current Step:</strong> {singleTestResult.currentStep}/5</div>
                  <div><strong>Steps Completed:</strong> {singleTestResult.stepsCompleted.join(', ')}</div>
                  <div><strong>Is Legacy:</strong> {singleTestResult.isLegacyCompany ? 'Yes' : 'No'}</div>
                  <div><strong>Registration Method:</strong> {singleTestResult.registrationMethod}</div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium">Step Completion Details:</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <strong>Step 1:</strong>
                        <ul className="ml-4">
                          <li>Personal Data: {singleTestResult.stepCompletionData.step1.personalDataComplete ? '✅' : '❌'}</li>
                          <li>Address: {singleTestResult.stepCompletionData.step1.addressComplete ? '✅' : '❌'}</li>
                          <li>Phone: {singleTestResult.stepCompletionData.step1.phoneVerified ? '✅' : '❌'}</li>
                          <li>Terms: {singleTestResult.stepCompletionData.step1.tosAccepted ? '✅' : '❌'}</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Step 2:</strong>
                        <ul className="ml-4">
                          <li>Company Data: {singleTestResult.stepCompletionData.step2.companyDataComplete ? '✅' : '❌'}</li>
                          <li>Legal Form: {singleTestResult.stepCompletionData.step2.legalFormSet ? '✅' : '❌'}</li>
                          <li>Website: {singleTestResult.stepCompletionData.step2.websiteProvided ? '✅' : '❌'}</li>
                          <li>Banking: {singleTestResult.stepCompletionData.step2.bankingComplete ? '✅' : '❌'}</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Step 3:</strong>
                        <ul className="ml-4">
                          <li>Profile Picture: {singleTestResult.stepCompletionData.step3.profilePictureUploaded ? '✅' : '❌'}</li>
                          <li>Description: {singleTestResult.stepCompletionData.step3.publicDescriptionComplete ? '✅' : '❌'}</li>
                          <li>Skills: {singleTestResult.stepCompletionData.step3.skillsAdded ? '✅' : '❌'}</li>
                          <li>Hourly Rate: {singleTestResult.stepCompletionData.step3.hourlyRateSet ? '✅' : '❌'}</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Step 4:</strong>
                        <ul className="ml-4">
                          <li>Categories: {singleTestResult.stepCompletionData.step4.categoriesSelected ? '✅' : '❌'}</li>
                          <li>Location: {singleTestResult.stepCompletionData.step4.locationConfigured ? '✅' : '❌'}</li>
                          <li>Working Hours: {singleTestResult.stepCompletionData.step4.workingHoursSet ? '✅' : '❌'}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Migration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚨 Full Migration 
            <Badge variant="destructive">PRODUCTION</Badge>
          </CardTitle>
          <CardDescription>
            <strong>WARNING:</strong> This will migrate ALL existing companies in the database. 
            Only run this ONCE during deployment. Test with single company first!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-medium text-red-800 mb-2">⚠️ Pre-Migration Checklist:</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>✅ Database backup created</li>
              <li>✅ Test migration completed successfully</li>
              <li>✅ Admin team notified</li>
              <li>✅ Rollback plan in place</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleFullMigration}
            disabled={isRunning}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isRunning ? 'Running Migration...' : 'RUN FULL MIGRATION'}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Migration Result:</h3>
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Process</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium">What this migration does:</h3>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Analyzes existing company data in users collection</li>
                <li>Calculates completion percentage based on existing fields</li>
                <li>Creates onboarding/progress sub-document for each company</li>
                <li>Sets status to 'grandfathered' for existing companies</li>
                <li>Preserves all existing data (no data loss)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium">Real Example - Mietkoch Andy:</h3>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>UID: 0Rj5vGkBjeXrzZKBr4cFfV0jRuw1</li>
                <li>Has: Personal data, company info, Stripe account, skills, category</li>
                <li>Missing: Public description, portfolio, FAQs, working hours</li>
                <li>Expected completion: ~75%</li>
                <li>Expected status: grandfathered (full dashboard access)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium">Step Analysis Logic:</h3>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Step 1:</strong> Personal data (step1.*) + Terms acceptance</li>
                <li><strong>Step 2:</strong> Company data (step2.*) + Banking (step4.iban)</li>
                <li><strong>Step 3:</strong> Profile picture + Skills + Hourly rate</li>
                <li><strong>Step 4:</strong> Categories + Location + Working hours</li>
                <li><strong>Step 5:</strong> Stripe account + Verification + Documents</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
