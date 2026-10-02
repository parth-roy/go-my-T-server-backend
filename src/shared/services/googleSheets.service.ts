import axios from 'axios';
import { logger } from '@shared/logger';

// NOTE: Do NOT read env vars at module level.
// TypeScript modules are evaluated at import time — before dotenv/config runs in server.ts.
// Always read process.env inside the function body so it picks up the loaded value.

// ── MetroMitra sheets (GOOGLE_SHEETS_WEBHOOK_URL) ────────────────────────────
type MetroMitraSheetName =
  | 'Post_Jobs'
  | 'Get_Job_Applicants'
  | 'Onboarding_Submissions'
  | 'WhatsApp_Messages';

export async function appendToSheet(sheet: MetroMitraSheetName, rowData: Record<string, any>): Promise<void> {
  const SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!SHEETS_WEBHOOK_URL) {
    logger.warn('[GoogleSheets/MetroMitra] GOOGLE_SHEETS_WEBHOOK_URL not set, skipping sheet append');
    return;
  }

  const payload = { sheet, timestamp: new Date().toISOString(), ...rowData };
  logger.info(`[GoogleSheets/MetroMitra] Sending to sheet "${sheet}": ${JSON.stringify(payload).slice(0, 300)}`);

  try {
    await axios.post(SHEETS_WEBHOOK_URL, payload, {
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
    });
    logger.info(`[GoogleSheets/MetroMitra] ✅ Successfully appended to sheet: ${sheet}`);
  } catch (err: any) {
    logger.error(`[GoogleSheets/MetroMitra] ❌ Failed to append to ${sheet}: ${err.message}`);
  }
}

// ── GoMyTruck / Vahan sheets (GMT_SHEETS_WEBHOOK_URL) ────────────────────────
type GmtSheetName =
  | 'Estimate_Requests'
  | 'Fleet_Partner_Leads'
  | 'Enterprise_Enquiries'
  | 'Contact_Messages'
  | 'Truck_Bookings'
  | 'Driver_Onboarding'
  | 'Agent_KYC_Submissions'
  | 'Agent_Load_Quotes';

export async function appendToGMTSheet(sheet: GmtSheetName, rowData: Record<string, any>): Promise<void> {
  const GMT_WEBHOOK_URL = process.env.GMT_SHEETS_WEBHOOK_URL;

  if (!GMT_WEBHOOK_URL) {
    logger.warn('[GoogleSheets/GMT] GMT_SHEETS_WEBHOOK_URL not set, skipping sheet append');
    return;
  }

  const payload = { sheet, timestamp: new Date().toISOString(), ...rowData };
  logger.info(`[GoogleSheets/GMT] Sending to sheet "${sheet}": ${JSON.stringify(payload).slice(0, 300)}`);

  try {
    await axios.post(GMT_WEBHOOK_URL, payload, {
      timeout: 8000,
      headers: { 'Content-Type': 'application/json' },
    });
    logger.info(`[GoogleSheets/GMT] ✅ Successfully appended to sheet: ${sheet}`);
  } catch (err: any) {
    logger.error(`[GoogleSheets/GMT] ❌ Failed to append to ${sheet}: ${err.message}`);
  }
}
