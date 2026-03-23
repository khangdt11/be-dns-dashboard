import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Req,
  Patch,
  Delete,
} from '@nestjs/common';
import { CloudflareService } from './cloudflare.service';
import { Role } from '../auth/decorators/role.decorator';
import type { CloudflareDnsRecordType } from 'src/utils/types';
import { CreateDnsRecordDto } from './dto/create-dns-record.dto';
import type { RequestWithUser } from 'src/auth/auth.controller';
import { UpdateDnsRecordDto } from './dto/udpate-dns-record.dto';
import { DeleteDnsRecordsDto } from './dto/delete-dns-records.dto';
import { PurgeCacheDto } from './dto/purge-cache.dto';

@Controller('cloudflare')
export class CloudflareController {
  constructor(private readonly cloudflareService: CloudflareService) {}

  // Only ADMIN and OPERATOR can access these routes
  @Get('zones')
  @Role('ADMIN', 'OPERATOR')
  async getZones() {
    const zones = await this.cloudflareService.getZones();
    return zones 
  }

  @Get('zones/:zoneId')
  @Role('ADMIN', 'OPERATOR')
  getZone(@Param('zoneId') zoneId: string) {
    return this.cloudflareService.getZoneDetails(zoneId);
  }

  @Get('zones/:zoneId/dns-records')
  @Role('ADMIN', 'OPERATOR')
  getDnsRecords(
    @Param('zoneId') zoneId: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('type') type?: CloudflareDnsRecordType,
    @Query('name') name?: string,
  ) {
    return this.cloudflareService.getDnsRecords(
      zoneId,
      page,
      perPage,
      type,
      name,
    );
  }

  @Post('zones/:zoneId/dns-records')
  @Role('ADMIN', 'OPERATOR')
  createDnsRecord(
    @Param('zoneId') zoneId: string,
    @Body() createDto: CreateDnsRecordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.cloudflareService.createDnsRecord(req.user, zoneId, createDto);
  }

  @Patch('zones/:zoneId/dns-records/:recordId')
  @Role('ADMIN', 'OPERATOR')
  updateDnsRecord(
    @Param('zoneId') zoneId: string,
    @Param('recordId') recordId: string,
    @Body() updateDto: UpdateDnsRecordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.cloudflareService.updateDnsRecord(
      req.user,
      zoneId,
      recordId,
      updateDto,
    );
  }

  @Delete('zones/:zoneId/dns-records/:recordId')
  @Role('ADMIN', 'OPERATOR')
  async deleteDnsRecord(
    @Param('zoneId') zoneId: string,
    @Param('recordId') recordId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.cloudflareService.deleteDnsRecord(req.user, zoneId, recordId);
    return {
      message: 'DNS record deleted successfully',
    };
  }

  @Delete('zones/:zoneId/dns-records')
  @Role('ADMIN', 'OPERATOR')
  async deleteDnsRecords(
    @Param('zoneId') zoneId: string,
    @Body() deleteRecordsDto: DeleteDnsRecordsDto,
    @Req() req: RequestWithUser,
  ) {
    await this.cloudflareService.deleteDnsRecords(
      req.user,
      zoneId,
      deleteRecordsDto.recordIds,
    );
    return {
      message: 'DNS records deleted successfully',
    };
  }

  @Post('zones/:zoneId/purge_cache')
  @Role('ADMIN', 'OPERATOR')
  async purgeCache(
    @Param('zoneId') zoneId: string,
    @Body() purgeCacheDto: PurgeCacheDto,
    @Req() req: RequestWithUser
    ) {
      return await this.cloudflareService.purgeCache(req.user.id,zoneId, purgeCacheDto)
  }
}
