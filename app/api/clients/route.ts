export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getClients, createClient } from '../../../lib/sheets';

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json(clients);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newClient = await createClient(data);
    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
