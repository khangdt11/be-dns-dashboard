import { Module } from '@nestjs/common';
import { CloudflareService } from './cloudflare.service';
import { CloudflareController } from './cloudflare.controller';
import { LogsModule } from 'src/logs/logs.module';

@Module({
  controllers: [CloudflareController],
  providers: [CloudflareService],
  imports: [LogsModule],
})
export class CloudflareModule {}
