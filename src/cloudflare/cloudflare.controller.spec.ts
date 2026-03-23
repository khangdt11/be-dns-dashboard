import { Test, TestingModule } from '@nestjs/testing';
import { CloudflareController } from './cloudflare.controller';
import { CloudflareService } from './cloudflare.service';
import { LogsService } from 'src/logs/logs.service';

describe('CloudflareController', () => {
  let controller: CloudflareController;

  const mockLogsService = {
    createLog: jest.fn()
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CloudflareController],
      providers: [CloudflareService, 
        {provide: LogsService, useValue: mockLogsService}
      ],
    }).compile();

    controller = module.get<CloudflareController>(CloudflareController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
