import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UserStatus } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { request } from 'http';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      parseInt(process.env.SALT_ROUNDS as string) || 10,
    );
    return this.prismaService.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async findOneById(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
    });
  }

  async findOneByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email },
    });
  }

  async findAll(status?: UserStatus) {
    if (!status) {
      return this.prismaService.user.findMany({
        // where: { status: { in: [UserStatus.ACTIVE, UserStatus.INACTIVE] } },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prismaService.user.findMany({
      where: { status },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.status === UserStatus.DELETED) {
      throw new ForbiddenException('Cannot update a deleted user');
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: updateUserDto,
      omit: { password: true },
    });

    return updatedUser;
  }

  async remove(reqUserId: string, id: string) {
    if (reqUserId === id) {
      throw new ForbiddenException('Users cannot delete themselves');
    }

    const existingUser = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.status === UserStatus.DELETED) {
      throw new ForbiddenException('User is already deleted');
    }

    await this.prismaService.user.update({
      where: { id },
      data: {
        status: UserStatus.DELETED,
        email: `${existingUser.email}-deleted-${Date.now()}`,
      },
    });
  }
}
