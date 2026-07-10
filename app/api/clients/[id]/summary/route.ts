export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // In a full implementation, this would query Google Sheets 'daily_summaries' tab
    // For now, we return 404 to trigger the frontend's robust fallback demo data.
    return NextResponse.json({ error: 'Summaries not yet implemented in Vercel backend' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
