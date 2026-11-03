import { BadGatewayException, Injectable } from '@nestjs/common';

const STACKFOLIO_API_URL = 'https://api.stackfolio.app/api';

type HistoricalSpotPrice = {
  ts: number;
  gold?: number;
  silver?: number;
};

@Injectable()
export class SpotPricesService {
  async getSpotPrices() {
    const res = await fetch(`${STACKFOLIO_API_URL}/spot-price`);
    if (!res.ok) {
      throw new BadGatewayException('Could not fetch spot prices.');
    }
    const data = await res.json();
    if (data === null || typeof data !== 'object') throw new BadGatewayException('Invalid spot prices response.');
    const { timestamp, prices } = data;

    if (typeof timestamp !== 'string' || timestamp === '' || !Number.isFinite(Date.parse(timestamp)))
      throw new BadGatewayException('Invalid timestamp.');
    if (prices === null || typeof prices !== 'object') throw new BadGatewayException('Invalid spot prices.');
    if (!Number.isFinite(prices.gold) || prices.gold <= 0) throw new BadGatewayException('Invalid gold price.');
    if (!Number.isFinite(prices.silver) || prices.silver <= 0) throw new BadGatewayException('Invalid silver price.');
    if (data.currency !== 'USD' || data.unit !== 'toz') {
      throw new BadGatewayException('Invalid spot price currency or unit.');
    }
    if (data.source === 'mock') {
      throw new BadGatewayException('Live spot prices unavailable.');
    }

    return data;
  }

  async getHistoricalSpotPrices(): Promise<HistoricalSpotPrice[]> {
    const res = await fetch(`${STACKFOLIO_API_URL}/spot-price/history?range=ALL&granularity=daily`);
    if (!res.ok) {
      throw new BadGatewayException('Could not fetch spot price history.');
    }
    const data = await res.json();
    if (data === null || !Array.isArray(data.prices)) {
      throw new BadGatewayException('Invalid spot price history response.');
    }
    if (data.meta?.range !== 'ALL' || data.meta?.granularity !== 'daily') {
      throw new BadGatewayException('Invalid spot price history metadata.');
    }

    for (const price of data.prices) {
      if (price === null || typeof price !== 'object' || !Number.isSafeInteger(price.ts) || price.ts < 0) {
        throw new BadGatewayException('Invalid historical price timestamp.');
      }
      for (const value of [price.gold, price.silver]) {
        if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
          throw new BadGatewayException('Invalid spot price.');
        }
      }
    }

    return data.prices;
  }
}
