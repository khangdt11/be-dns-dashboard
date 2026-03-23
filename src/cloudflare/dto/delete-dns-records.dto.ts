import { IsArray } from 'class-validator';

export class DeleteDnsRecordsDto {
  @IsArray()
  recordIds: string[];
}
