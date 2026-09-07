import axios from 'axios';
import crypto from 'crypto';
import { env } from '@config/env';
import { logger } from '@shared/logger';

export interface CreateCashfreeOrderParams {
  orderId: string;
  orderAmount: number;
  orderCurrency?: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  returnUrl?: string;
  notifyUrl?: string;
  orderNote?: string;
  orderTags?: Record<string, string>;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  entity: string;
  order_currency: string;
  order_amount: number;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'TERMINATED' | 'TERMINATION_REQUESTED';
  payment_session_id: string;
  order_expiry_time?: string;
  order_note?: string;
  created_at?: string;
  customer_details?: {
    customer_id: string;
    customer_phone: string;
    customer_name?: string;
    customer_email?: string;
  };
}

export interface CashfreePaymentEntity {
  cf_payment_id: string;
  order_id: string;
  entity: string;
  payment_currency: string;
  payment_amount: number;
  payment_time: string;
  payment_status: 'SUCCESS' | 'NOT_ATTEMPTED' | 'FAILED' | 'USER_DROPPED' | 'VOID' | 'CANCELLED' | 'PENDING';
  payment_message?: string;
  bank_reference?: string;
  payment_group?: string;
  payment_method?: Record<string, any>;
}

class CashfreeClient {
  private getBaseUrl(): string {
    const envVal = process.env.CASHFREE_ENV || env.CASHFREE_ENV;
    const isProd = envVal === 'PROD' || envVal === 'production';
    return isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
  }

  private getHeaders(): Record<string, string> {
    const apiVersion = process.env.CASHFREE_API_VERSION || env.CASHFREE_API_VERSION || '2023-08-01';
    const appId = process.env.CASHFREE_APP_ID !== undefined ? process.env.CASHFREE_APP_ID : (env.CASHFREE_APP_ID || '');
    const secretKey = process.env.CASHFREE_SECRET_KEY !== undefined ? process.env.CASHFREE_SECRET_KEY : (env.CASHFREE_SECRET_KEY || '');

    return {
      'Content-Type': 'application/json',
      'x-api-version': apiVersion,
      'x-client-id': appId,
      'x-client-secret': secretKey,
    };
  }

  public isConfigured(): boolean {
    const appId = process.env.CASHFREE_APP_ID !== undefined ? process.env.CASHFREE_APP_ID : env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY !== undefined ? process.env.CASHFREE_SECRET_KEY : env.CASHFREE_SECRET_KEY;
    return Boolean(appId && secretKey);
  }

  /**
   * Create an order in Cashfree to obtain a payment_session_id
   */
  public async createOrder(params: CreateCashfreeOrderParams): Promise<CashfreeOrderResponse> {
    const cleanPhone = String(params.customerPhone || '').replace(/\D/g, '').slice(-10);
    const cleanCustomerId = `cust_${cleanPhone || Date.now()}`;

    const defaultReturnUrl = params.returnUrl || `https://metromitra.com/direct-contact?cf_order_id=${params.orderId}`;
    const defaultNotifyUrl = params.notifyUrl || `https://api.gomytruck.com/api/v1/payments/cashfree-webhook`;

    const payload: Record<string, any> = {
      order_id: params.orderId,
      order_amount: Number(params.orderAmount.toFixed(2)),
      order_currency: params.orderCurrency || 'INR',
      customer_details: {
        customer_id: cleanCustomerId,
        customer_phone: cleanPhone || '9999999999',
        customer_name: params.customerName?.trim() || 'MetroMitra Customer',
        customer_email: params.customerEmail?.trim() || 'support@metromitra.com',
      },
      order_meta: {
        return_url: defaultReturnUrl,
        notify_url: defaultNotifyUrl,
      },
      order_note: params.orderNote || 'MetroMitra Direct Contact Unlock',
      order_tags: params.orderTags || {},
    };

    if (!this.isConfigured()) {
      logger.warn('[Cashfree] API keys not configured in .env. Returning mock session for development.');
      return {
        cf_order_id: `cf_mock_${Date.now()}`,
        order_id: params.orderId,
        entity: 'order',
        order_currency: payload.order_currency,
        order_amount: payload.order_amount,
        order_status: 'ACTIVE',
        payment_session_id: `session_mock_${Date.now()}`,
      };
    }

    try {
      const url = `${this.getBaseUrl()}/orders`;
      const response = await axios.post<CashfreeOrderResponse>(url, payload, {
        headers: this.getHeaders(),
        timeout: 15000,
      });

      return response.data;
    } catch (err: any) {
      const errDetails = err.response?.data || err.message;
      logger.error('[Cashfree] Error creating order:', errDetails);
      throw new Error(err.response?.data?.message || 'Failed to create Cashfree order');
    }
  }

  /**
   * Fetch order details by order_id
   */
  public async getOrder(orderId: string): Promise<CashfreeOrderResponse> {
    if (!this.isConfigured()) {
      return {
        cf_order_id: `cf_mock_${orderId}`,
        order_id: orderId,
        entity: 'order',
        order_currency: 'INR',
        order_amount: 49.0,
        order_status: 'PAID',
        payment_session_id: `session_mock_${orderId}`,
      };
    }

    try {
      const url = `${this.getBaseUrl()}/orders/${encodeURIComponent(orderId)}`;
      const response = await axios.get<CashfreeOrderResponse>(url, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      return response.data;
    } catch (err: any) {
      logger.error(`[Cashfree] Error fetching order ${orderId}:`, err.response?.data || err.message);
      throw new Error(err.response?.data?.message || 'Failed to fetch Cashfree order status');
    }
  }

  /**
   * Fetch payment attempts for an order
   */
  public async getOrderPayments(orderId: string): Promise<CashfreePaymentEntity[]> {
    if (!this.isConfigured()) {
      return [
        {
          cf_payment_id: `cf_pay_mock_${Date.now()}`,
          order_id: orderId,
          entity: 'payment',
          payment_currency: 'INR',
          payment_amount: 49.0,
          payment_time: new Date().toISOString(),
          payment_status: 'SUCCESS',
          bank_reference: 'MOCK_REF_123',
        },
      ];
    }

    try {
      const url = `${this.getBaseUrl()}/orders/${encodeURIComponent(orderId)}/payments`;
      const response = await axios.get<CashfreePaymentEntity[]>(url, {
        headers: this.getHeaders(),
        timeout: 10000,
      });

      return response.data;
    } catch (err: any) {
      logger.error(`[Cashfree] Error fetching payments for order ${orderId}:`, err.response?.data || err.message);
      return [];
    }
  }

  /**
   * Verify Cashfree Webhook HMAC-SHA256 signature
   * signatureData = timestamp + rawBody
   * computed = Base64(HMAC_SHA256(signatureData, secretKey))
   */
  public verifyWebhookSignature({
    signature,
    timestamp,
    rawBody,
  }: {
    signature: string;
    timestamp: string;
    rawBody: string | Buffer;
  }): boolean {
    const secretKey = process.env.CASHFREE_SECRET_KEY || env.CASHFREE_SECRET_KEY;
    if (!secretKey) {
      logger.warn('[Cashfree] Cannot verify webhook signature: CASHFREE_SECRET_KEY is not set');
      return false;
    }

    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const signatureData = timestamp + bodyStr;

      const computedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(signatureData)
        .digest('base64');

      return computedSignature === signature;
    } catch (err: any) {
      logger.error('[Cashfree] Error verifying webhook signature:', err.message);
      return false;
    }
  }
}

export const cashfreeClient = new CashfreeClient();
