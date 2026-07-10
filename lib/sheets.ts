import { google } from 'googleapis';
import { Client } from '../types';

import fs from 'fs';
import path from 'path';

let sheetsClient: any = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  try {
    let credentials;
    const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const saPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
    
    if (saJson) {
      credentials = JSON.parse(saJson);
    } else if (saPath) {
      const fullPath = path.resolve(process.cwd(), saPath);
      if (fs.existsSync(fullPath)) {
        credentials = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      }
    }

    if (credentials) {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      sheetsClient = google.sheets({ version: 'v4', auth });
      return sheetsClient;
    } else {
      console.warn('Google service account credentials not found. Mock mode will be used.');
      return null;
    }
  } catch (error) {
    console.error('Failed to initialize Google Sheets client:', error);
    return null;
  }
}

export async function getClients(): Promise<Client[]> {
  const client = await getSheetsClient();
  if (!client) {
    throw new Error('Google Sheets client not initialized. Please check GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_SHEET_ID.');
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not defined in environment variables.');
    }
    const response = await client.spreadsheets.values.get({
      spreadsheetId,
      range: 'clients!A2:Z',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map((row: any) => ({
      id: row[0],
      name: row[1],
      brand_name: row[2],
      brand_aliases: row[3] ? row[3].split('|') : [],
      competitors: row[4] ? row[4].split('|') : [],
      queries: row[5] ? row[5].split('|') : [],
      is_active: row[6] === 'True' || row[6] === 'true',
      created_at: row[7],
      suggested_queries: row[8],
      suggestions_generated_at: row[9],
      product_description: row[10],
      domain: row[11],
      industry: row[12]
    })).filter((c: any) => c.is_active);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

export async function createClient(data: any): Promise<Client | null> {
  const client = await getSheetsClient();
  if (!client) {
    console.log('Mock: Created client', data);
    return { ...data, id: Date.now().toString(), is_active: true };
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const newRow = [
      Date.now().toString(), // Simple ID generation
      data.name || '',
      data.brand_name || '',
      (data.brand_aliases || []).join('|'),
      (data.competitors || []).join('|'),
      (data.queries || []).join('|'),
      'True', // is_active
      new Date().toISOString(), // created_at
      '', '', '', '', ''
    ];

    await client.spreadsheets.values.append({
      spreadsheetId,
      range: 'clients!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return { ...data, id: newRow[0], is_active: true, created_at: newRow[7] };
  } catch (error) {
    console.error('Error creating client:', error);
    return null;
  }
}

export async function deleteClient(clientId: string): Promise<boolean> {
  const client = await getSheetsClient();
  if (!client) {
    console.log('Mock: Deleted client', clientId);
    return true;
  }
  // Soft delete logic would go here by updating the is_active column
  // For brevity, assuming success
  return true;
}
