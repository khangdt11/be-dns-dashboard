import {
  ConflictException,
  NotFoundException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import Cloudflare, { InternalServerError } from 'cloudflare';
import { CloudflareDnsRecordType } from 'src/utils/types';
import type { AppRole } from '../auth/decorators/role.decorator';
import { CreateDnsRecordDto } from './dto/create-dns-record.dto';
import { UpdateDnsRecordDto } from './dto/udpate-dns-record.dto';
import { LogsService } from 'src/logs/logs.service';
import { log } from 'console';
import { PurgeCacheDto } from './dto/purge-cache.dto';

@Injectable()
export class CloudflareService {
  private readonly client: Cloudflare;
  private readonly adminClient: Cloudflare;
  private readonly normalClient: Cloudflare;

  constructor(private readonly logsService: LogsService) {
    this.client = new Cloudflare({
      apiToken: process.env.CLOUDFLARE_API_NORMAL_TOKEN,
    });

    this.adminClient = new Cloudflare({
      apiToken: process.env.CLOUDFLARE_API_ADMIN_TOKEN,
    });

    this.normalClient = new Cloudflare({
      apiToken: process.env.CLOUDFLARE_API_NORMAL_TOKEN,
    });
  }

  private getClientByRole(role: AppRole) {
    if (role === 'ADMIN') {
      return this.adminClient;
    }
    return this.normalClient;
  }

  async getZones() {
    const zones = (await this.client.zones.list({})).result;
    return zones;
  }

  async getZoneDetails(zoneId: string) {
    const zone = await this.client.zones.get({ zone_id: zoneId });
    return zone;
  }

  async getDnsRecords(
    zoneId: string,
    page?: number,
    perPage?: number,
    type?: CloudflareDnsRecordType,
    name?: string,
  ) {
    const recordsResponse = await this.client.dns.records.list({
      zone_id: zoneId,
      page: page,
      per_page: (perPage = 50),
      type: type as CloudflareDnsRecordType,
      name: { contains: name },
    });
    return recordsResponse;
  }

  async getDnsRecord(zoneId: string, recordId: string) {
    const record = await this.client.dns.records.get(recordId, {
      zone_id: zoneId,
    });
    return record;
  }

  private isRootDomainRecord(name: string, zoneName: string) {
    return name === '@' || name === zoneName;
  }

  async createDnsRecord(
    reqUser: any,
    zoneId: string,
    createDto: CreateDnsRecordDto,
  ) {
    const { type, name, content, ttl = 1, proxied = true } = createDto;

    const client = this.getClientByRole(reqUser.role);
    const zoneName = (await this.getZoneDetails(zoneId)).name;
    if (this.isRootDomainRecord(name, zoneName)) {
      await this.logsService.createLog({
        userId: reqUser.id,
        type: 'CREATE',
        zone: zoneName,
        recordName: name,
        before: null,
        after: createDto,
        status: 'FAILURE',
      });
      throw new ForbiddenException(
        'Creating root domain record is not allowed',
      );
    }

    try {
      const newRecord = await client.dns.records.create({
        zone_id: zoneId,
        type,
        name,
        content,
        ttl,
        proxied,
      });

      await this.logsService.createLog({
        userId: reqUser.id,
        type: 'CREATE',
        zone: zoneName,
        recordName: newRecord.name,
        before: null,
        after: newRecord,
        status: 'SUCCESS',
      });
      return newRecord;
    } catch (error) {
      const zoneName = (await this.getZoneDetails(zoneId)).name;
      await this.logsService.createLog({
        userId: reqUser.id,
        type: 'CREATE',
        zone: zoneName,
        recordName: '*',
        before: null,
        after: createDto,
        status: 'FAILURE',
      });
      throw new InternalServerErrorException(
        'Failed to create DNS record: ' + error.message,
      );
    }
  }

  private generateLogMessage(newUpdate: UpdateDnsRecordDto, oldRecord: any) {
    const changes: string[] = [];
    if (newUpdate.type && newUpdate.type !== oldRecord.type) {
      changes.push(`type from ${oldRecord.type} to ${newUpdate.type}`);
    }
    if (newUpdate.name && newUpdate.name !== oldRecord.name) {
      changes.push(`name from ${oldRecord.name} to ${newUpdate.name}`);
    }
    if (newUpdate.content && newUpdate.content !== oldRecord.content) {
      changes.push(`content from ${oldRecord.content} to ${newUpdate.content}`);
    }
    if (newUpdate.ttl !== oldRecord.ttl) {
      changes.push(`ttl from ${oldRecord.ttl} to ${newUpdate.ttl}`);
    }
    if (
      newUpdate.proxied !== undefined &&
      newUpdate.proxied !== oldRecord.proxied
    ) {
      changes.push(`proxied from ${oldRecord.proxied} to ${newUpdate.proxied}`);
    }

    return changes;
  }

  async updateDnsRecord(
    reqUser: any,
    zoneId: string,
    recordId: string,
    updateDto: UpdateDnsRecordDto,
  ) {
    const { type, name, content, ttl = 1, proxied = true } = updateDto;
    const record = await this.getDnsRecord(zoneId, recordId);
    const logMessage = this.generateLogMessage(updateDto, record);
    const zone = await this.getZoneDetails(zoneId);
    if (this.isRootDomainRecord(name, zone.name)) {
      throw new ForbiddenException(
        'Updating root domain record is not allowed',
      );
    }

    const client = this.getClientByRole(reqUser.role);
    const existingRecord = await this.getDnsRecord(zoneId, recordId);

    try {
      const updatedRecord = await client.dns.records.edit(recordId, {
        zone_id: zoneId,
        type,
        name,
        content,
        ttl,
        proxied,
      });

      await this.logsService.createLog({
        userId: reqUser.id,
        type: 'UPDATE',
        zone: zone.name,
        recordName: record.name,
        message: logMessage,
        status: 'SUCCESS',
        before: existingRecord,
        after: updatedRecord,
      });
      return updatedRecord;
    } catch (error) {
      await this.logsService.createLog({
        userId: reqUser.id,
        type: 'UPDATE',
        zone: zone.name,
        recordName: record.name,
        message: logMessage,
        status: 'FAILURE',
        before: existingRecord,
        after: null,
      });
      throw new InternalServerErrorException(
        'Failed to update DNS record: ' + error.message,
      );
    }
  }

  async deleteDnsRecord(reqUser: any, zoneId: string, recordId: string) {
    const client = this.getClientByRole(reqUser.role);
    const record = await this.getDnsRecord(zoneId, recordId);
    if (!record) {
      throw new NotFoundException('DNS record not found');
    }
    const zoneName = (await this.getZoneDetails(zoneId)).name;
    if (this.isRootDomainRecord(record.name, zoneName)) {
      throw new ForbiddenException(
        'Deleting root domain record is not allowed',
      );
    }
    try {
      const deleteResponse = await client.dns.records.delete(recordId, {
        zone_id: zoneId,
      });

      await this.logsService.createLog({
        userId: reqUser.id,
        type: 'DELETE',
        zone: zoneName,
        recordName: record.name,
        status: 'SUCCESS',
        before: record,
        after: null,
      });
      return deleteResponse;
    } catch (error) {
      await this.logsService.createLog({
        userId: reqUser.id,
        type: 'DELETE',
        zone: zoneName,
        recordName: record.name,
        status: 'FAILURE',
        before: record,
        after: null,
      });
      throw new InternalServerErrorException(
        'Failed to delete DNS record: ' + error.message,
      );
    }
  }

  async deleteDnsRecords(reqUser: any, zoneId: string, recordIds: string[]) {
    for (const recordId of recordIds) {
      await this.deleteDnsRecord(reqUser, zoneId, recordId);
    }
  }

  async purgeCache(
    reqUserId: string,
    zoneId: string,
    purgeCacheDto: PurgeCacheDto,
  ) {
    const { purgeEverything, hosts } = purgeCacheDto;
    console.log(hosts);

    if (!purgeEverything && !hosts) {
      throw new BadRequestException('Purge options required');
    }

    const zoneName = (await this.getZoneDetails(zoneId)).name;

    let flag = true;
    try {
      let res: any;
      if (purgeEverything) {
        res = await this.client.cache.purge({
          zone_id: zoneId,
          purge_everything: purgeEverything,
        });
      } else {
        res = await this.client.cache.purge({
          zone_id: zoneId,
          hosts,
        });

        flag = res ? true : false;
      }

      if (flag) {
        await this.logsService.createLog({
          userId: reqUserId,
          type: 'PURGE_CACHE',
          zone: zoneName,
          recordName: '*',
          status: 'SUCCESS',
          cacheScope: purgeEverything ? 'EVERYTHING' : 'CUSTOM',
          message: purgeEverything ? ['Purge everything'] : hosts,
        });
      } else {
        throw new Error(`Purged cache failed, check your request`);
      }
    } catch (error) {
      await this.logsService.createLog({
        userId: reqUserId,
        type: 'PURGE_CACHE',
        zone: zoneName,
        recordName: '*',
        status: 'FAILURE',
        cacheScope: purgeEverything ? 'EVERYTHING' : 'CUSTOM',
        message: purgeEverything ? ['Purge everything'] : hosts,
      });
      throw new InternalServerErrorException(
        error.message || 'Purge cache action failed',
      );
    }

    return {
      message: 'Purged cache successfully',
    };
  }
}
