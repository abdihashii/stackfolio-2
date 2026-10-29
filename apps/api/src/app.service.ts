import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm'

@Injectable()
export class AppService {
  constructor(private dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<{ status: string, dbStatus: string, datetime: string }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }

    return {
      status: "ok",
      dbStatus: 'up',
      datetime: new Date().toISOString(),
    }
  }
}
