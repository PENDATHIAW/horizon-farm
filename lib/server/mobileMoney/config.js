/** Configuration Wave / Orange Money — clés API Vercel (serveur uniquement). */
export const MOBILE_MONEY_PROVIDERS = {
  wave: {
    id: 'wave',
    label: 'Wave',
    paymentMethod: 'wave',
  },
  orange_money: {
    id: 'orange_money',
    label: 'Orange Money',
    paymentMethod: 'orange_money',
  },
};

export function mobileMoneySandbox() {
  return process.env.MOBILE_MONEY_SANDBOX === 'true'
    || process.env.MOBILE_MONEY_SANDBOX === '1'
    || !process.env.WAVE_API_KEY
    && !process.env.ORANGE_MONEY_API_KEY;
}

export function waveConfig() {
  return {
    apiKey: process.env.WAVE_API_KEY || '',
    merchantId: process.env.WAVE_MERCHANT_ID || '',
    baseUrl: process.env.WAVE_API_BASE || 'https://api.wave.com',
  };
}

export function orangeMoneyConfig() {
  return {
    apiKey: process.env.ORANGE_MONEY_API_KEY || '',
    merchantCode: process.env.ORANGE_MONEY_MERCHANT_CODE || '',
    baseUrl: process.env.ORANGE_MONEY_API_BASE || 'https://api.orange.com/orange-money-webpay',
  };
}
