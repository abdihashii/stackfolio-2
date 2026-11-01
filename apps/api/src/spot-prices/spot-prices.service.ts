import { BadGatewayException, Injectable } from '@nestjs/common';

@Injectable()
export class SpotPricesService {
  async getSpotPrices() {
    const res = await fetch(`https://api.stackfolio.app/api/spot-price`);
    if (!res.ok) {
      throw new BadGatewayException('Could not fetch spot price.');
    }
    return await res.json();
  }
}
