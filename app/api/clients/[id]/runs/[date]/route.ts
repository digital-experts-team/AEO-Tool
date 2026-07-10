import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string; date: string } }
) {
  try {
    return NextResponse.json({ error: 'Runs not yet implemented' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
