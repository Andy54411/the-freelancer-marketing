import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies } from '@/lib/companies-list-data';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all companies
    const companies = await getAllCompanies();

    return NextResponse.json({
      success: true,
      companies,
      count: companies.length,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}
