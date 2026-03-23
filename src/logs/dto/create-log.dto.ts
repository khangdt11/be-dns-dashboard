import { IsEnum, IsJSON, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LogAction, CacheScope, LogStatus } from '@prisma/client';



export class CreateLogDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  type: LogAction;

  @IsNotEmpty()
  @IsString()
  zone: string;

  @IsOptional()
  @IsString()
  recordName?: string;


  @IsNotEmpty()
  @IsString()
  status: LogStatus;

  @IsNotEmpty()
  @IsJSON()
  before?: any;

  @IsNotEmpty()
  @IsJSON()
  after?: any;

  
  @IsOptional()
  @IsString()
  message?: string[];

  @IsOptional()
  @IsString()
  cacheScope?: CacheScope

}
