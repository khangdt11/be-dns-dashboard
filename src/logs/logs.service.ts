import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLogDto } from './dto/create-log.dto';
import { GetLogsDto } from './dto/get-logs.dto';

@Injectable()
export class LogsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createLog(createLogDto: CreateLogDto) {
    const { userId, type, zone, recordName, status, message, before, after, cacheScope } =
      createLogDto;
    return this.prismaService.log.create({
      data: {
        userId,
        type,
        zone,
        recordName: recordName || '',
        message: message || [],
        cacheScope: cacheScope || null,
        status,
        before,
        after,
      },
    });
  }

  async findAll(filters: GetLogsDto
    // {
    // type?: LogType;
    // zone?: string;
    // status?: 'SUCCESS' | 'FAILURE';
    // from?: Date;
    // to?: Date;
    // page?: number;
    // limit?: number;
    // user?: string;
    // }
) {
    const {
      type,
      zone,
      status,
      from,
      to,
      page = 1,
      limit = 20,
      user,
    } = filters;

    const safeLimit = Math.min(limit, 100);

    const where: any = {
      type: type ? type : {
        not: "PURGE_CACHE"
      },
      zone: zone ? zone : undefined,
      status: status ? status : undefined,
      userId: user ? user : undefined,
      timestamp:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            }
          : undefined,
    };

    const [data, total] = await this.prismaService.$transaction([
      this.prismaService.log.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * safeLimit,
        take: safeLimit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prismaService.log.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
        hasNext: page * safeLimit < total,
        hasPrev: page > 1,
      },
    };
  }
}
