import { NextResponse } from 'next/server';
import { JobNotificationService } from '@/lib/job-notification-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, location } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Mock data for testing
    const mockJobs = [
      {
        id: 'test-1',
        title: 'Chef de Partie (m/w/d)',
        company: 'Grand Hotel Berlin',
        location: 'Berlin',
        url: 'https://taskilo.de/jobs/test-1'
      },
      {
        id: 'test-2',
        title: 'Servicekraft (m/w/d)',
        company: 'Restaurant Zum Goldenen Löwen',
        location: 'Berlin',
        url: 'https://taskilo.de/jobs/test-2'
      }
    ];

    const result = await JobNotificationService.sendJobAlert({
      userEmail: email,
      searchCriteria: {
        location: location || 'Berlin',
        jobGroups: ['Küche', 'Service']
      },
      newJobs: mockJobs
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error sending test job alert:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
