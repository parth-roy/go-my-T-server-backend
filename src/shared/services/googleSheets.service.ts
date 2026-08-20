import { google } from 'googleapis';
import { env } from '@config/env';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

class GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string;
  private isConfigured: boolean = false;

  constructor() {
    this.spreadsheetId = env.GOOGLE_SPREADSHEET_ID || '';
    
    if (this.spreadsheetId && env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: env.GOOGLE_CLIENT_EMAIL,
            private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          },
          scopes: SCOPES,
        });

        this.sheets = google.sheets({ version: 'v4', auth });
        this.isConfigured = true;
        console.log('✅ Google Sheets API configured successfully.');
      } catch (error) {
        console.error('❌ Failed to configure Google Sheets API:', error);
      }
    } else {
      console.warn('⚠️ Google Sheets API credentials missing. Skipping sheet integration.');
    }
  }

  public async appendLead(leadData: any[]) {
    if (!this.isConfigured) return;

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [leadData],
        },
      });
      console.log('✅ Successfully appended lead to Google Sheets');
    } catch (error) {
      console.error('❌ Error appending to Google Sheets:', error);
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
