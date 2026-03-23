import {
  IsDate,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { LogAction, LogStatus } from '@prisma/client';

export class GetLogsDto {
  @IsOptional()
  @IsString()
  type?: LogAction;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  status?: LogStatus;
  @IsOptional()
  @IsDateString()
  from?: Date;

  @IsOptional()
  @IsDateString()
  to?: Date;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
  @IsOptional()
  @IsString()
  user?: string;
}
