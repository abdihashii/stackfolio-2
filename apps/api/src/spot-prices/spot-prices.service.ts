import { BadGatewayException, Injectable } from '@nestjs/common';

const METALS_API_URL_PATH = 'https://api.metals.dev/v1';

@Injectable()
export class SpotPricesService {
  async getSpotPriceByMetal(metal: 'gold' | 'silver') {
    const res = await fetch(
      `${METALS_API_URL_PATH}/metal/spot?api_key=${process.env.METALS_DEV_API_KEY}&metal=${metal}&currency=USD`,
    );
    if (!res.ok) {
      throw new BadGatewayException('Could not fetch spot price.');
    }
    return await res.json();
  }
}
