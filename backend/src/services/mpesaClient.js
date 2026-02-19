const { requestJson } = require('../utils/httpClient');

class MpesaClient {
  constructor(settings) {
    this.settings = settings;
    this.baseUrl = settings.environment === 'live' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
    this._accessToken = null;
    this._accessTokenExpiresAt = 0;
  }

  async getAccessToken() {
    const now = Date.now();
    if (this._accessToken && now < this._accessTokenExpiresAt - 30_000) return this._accessToken;

    const { consumer_key, consumer_secret } = this.settings;
    if (!consumer_key || !consumer_secret) {
      throw new Error('M-Pesa credentials not configured');
    }

    const basic = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');
    const url = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    const res = await requestJson(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basic}`,
      },
    });

    const token = res.data?.access_token;
    const expiresIn = parseInt(res.data?.expires_in ?? '3599', 10);
    if (!token) throw new Error('Failed to obtain M-Pesa access token');
    this._accessToken = token;
    this._accessTokenExpiresAt = now + (Number.isFinite(expiresIn) ? expiresIn * 1000 : 3_599_000);
    return token;
  }

  static formatTimestamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  static normalizePhone(input) {
    const raw = String(input || '').trim();
    if (!raw) throw new Error('Phone number is required');

    let digits = raw.replace(/[^\d]/g, '');
    if (digits.startsWith('0')) digits = `254${digits.slice(1)}`;
    if (digits.startsWith('2540')) digits = `254${digits.slice(4)}`;

    if (digits.length !== 12 || !digits.startsWith('2547') && !digits.startsWith('2541')) {
      throw new Error('Phone number must be a valid Kenyan number (e.g., 2547XXXXXXXX)');
    }

    return digits;
  }

  async stkPush({ amount, phone, accountReference, transactionDesc, callbackUrl }) {
    const token = await this.getAccessToken();
    const { passkey, shortcode, party_b } = this.settings;
    if (!passkey || !shortcode) throw new Error('M-Pesa shortcode/passkey not configured');

    const timestamp = MpesaClient.formatTimestamp(new Date());
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const phoneNorm = MpesaClient.normalizePhone(phone);
    const partyB = party_b || shortcode;

    const url = `${this.baseUrl}/mpesa/stkpush/v1/processrequest`;
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(Number(amount)),
      PartyA: phoneNorm,
      PartyB: partyB,
      PhoneNumber: phoneNorm,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    const res = await requestJson(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: payload,
    });

    return res.data;
  }
}

module.exports = MpesaClient;

