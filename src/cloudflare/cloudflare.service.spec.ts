import { Test, TestingModule } from '@nestjs/testing';
import { CloudflareService } from './cloudflare.service';
import { LogsService } from 'src/logs/logs.service';

describe('CloudflareService', () => {
  let service: CloudflareService;

  const mockLogsService = {
    createLog: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudflareService,
        {provide: LogsService, useValue: mockLogsService}
      ],
    }).compile();

    service = module.get<CloudflareService>(CloudflareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
