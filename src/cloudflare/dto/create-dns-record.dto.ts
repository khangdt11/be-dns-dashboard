import type { CloudflareDnsRecordType } from 'src/utils/types';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDnsRecordDto {
  @IsNotEmpty()
  type: CloudflareDnsRecordType;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNumber()
  @IsOptional()
  ttl?: number;

  @IsBoolean()
  @IsOptional()
  proxied?: boolean;
}
