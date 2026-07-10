import { NextResponse } from 'next/server';
import { getClients } from '../../../lib/sheets';
import { processClient } from '../../../lib/ai';

export async function POST() {
  try {
    const clients = await getClients();
    
    // In Vercel, this might time out if it takes > 10-60s. 
    // Consider using Next.js Background Routes or chunking for large datasets.
    const results = [];
    for (const client of clients) {
      if (client.is_active) {
        const result = await processClient(client);
        results.push(result);
      }
    }
    
    return NextResponse.json({ message: 'Daily job completed successfully', results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
