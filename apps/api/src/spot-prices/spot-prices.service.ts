import { BadGatewayException, Injectable } from '@nestjs/common';

@Injectable()
export class SpotPricesService {
  async getSpotPrices() {
    const res = await fetch(`https://api.stackfolio.app/api/spot-price`);
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
}
