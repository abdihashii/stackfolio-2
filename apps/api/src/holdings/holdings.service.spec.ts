import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Item } from './entities/item.entity.js';
import { HoldingsService } from './holdings.service.js';

describe('HoldingsService', () => {
  let service: HoldingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HoldingsService, { provide: getRepositoryToken(Item), useValue: {} }],
    }).compile();

    service = module.get<HoldingsService>(HoldingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
