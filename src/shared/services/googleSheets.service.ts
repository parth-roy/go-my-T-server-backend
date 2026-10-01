import axios from 'axios';
import { logger } from '@shared/logger';

// NOTE: Do NOT read GOOGLE_SHEETS_WEBHOOK_URL at module level.
// TypeScript modules are evaluated at import time — before dotenv/config runs in server.ts.
// Always read process.env inside the function body so it picks up the loaded value.

type SheetName = 'Post_Jobs' | 'Get_Job_Applicants' | 'Onboarding_Submissions';

export async function appendToSheet(sheet: SheetName, rowData: Record<string, any>): Promise<void> {
  // Read fresh on every call — guaranteed to see dotenv-loaded value
  const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!SHEETS_WEBHOOK_URL) {
    logger.warn('[GoogleSheets] GOOGLE_SHEETS_WEBHOOK_URL not set, skipping sheet append');
    return;
  }

  const payload = {
    sheet,
    timestamp: new Date().toISOString(),
    ...rowData,
  };

  logger.info(`[GoogleSheets] Sending to sheet "${sheet}": ${JSON.stringify(payload).slice(0, 300)}`);

  try {
    await axios.post(SHEETS_WEBHOOK_URL, payload, {
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
    });
    logger.info(`[GoogleSheets] ✅ Successfully appended to sheet: ${sheet}`);
  } catch (err: any) {
    // Non-blocking — never let sheet failures break the main flow
    logger.error(`[GoogleSheets] ❌ Failed to append to ${sheet}: ${err.message}`);
  }
}

