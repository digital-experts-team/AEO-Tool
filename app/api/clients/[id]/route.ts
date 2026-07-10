import { NextResponse } from 'next/server';
import { deleteClient } from '../../../../lib/sheets';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteClient(params.id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Client ${params.id} successfully deleted` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
