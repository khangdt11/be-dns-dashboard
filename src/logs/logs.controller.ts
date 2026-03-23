import { Controller, Post, Body, Req, Query } from '@nestjs/common';
import { LogsService } from './logs.service';
import { Role } from 'src/auth/decorators/role.decorator';
import { GetLogsDto } from './dto/get-logs.dto';
import type { RequestWithUser } from 'src/auth/auth.controller';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  @Role('ADMIN', 'OPERATOR')
  async getLogs(@Body() getLogsDto: GetLogsDto, @Req() req: RequestWithUser ) {
    const { type, zone, status, from, to, page, limit, user } = getLogsDto;

    return await this.logsService.findAll({
      type,
      zone,
      status,
      from,
      to,
      page,
      limit,
      user: req.user.role === 'OPERATOR' ? req.user.id : user,
    });
  }
}
