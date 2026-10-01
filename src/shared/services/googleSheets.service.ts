import axios from 'axios';
import { logger } from '@shared/logger';

const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

type SheetName = 'Post_Jobs' | 'Get_Job_Applicants' | 'Onboarding_Submissions';

export async function appendToSheet(sheet: SheetName, rowData: Record<string, any>): Promise<void> {
  if (!SHEETS_WEBHOOK_URL) {
    logger.warn('[GoogleSheets] GOOGLE_SHEETS_WEBHOOK_URL not set, skipping sheet append');
    return;
  }
  try {
    await axios.post(SHEETS_WEBHOOK_URL, {
      sheet,
      timestamp: new Date().toISOString(),
      ...rowData,
    }, { timeout: 8000 });
    logger.info(`[GoogleSheets] Appended to sheet: ${sheet}`);
  } catch (err: any) {
    // Non-blocking — never let sheet failures break the main flow
    logger.error(`[GoogleSheets] Failed to append to ${sheet}: ${err.message}`);
  }
}
