import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '../auth/decorators/role.decorator';
import type { RequestWithUser } from 'src/auth/auth.controller';
import { UserStatus } from './dto/update-user.dto';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Role('ADMIN')
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password: _, ...result } = user;
    return result;
  }

  @Get()
  @Role('ADMIN')
  async getAllUsers(@Query('status') status: UserStatus) {
    return await this.usersService.findAll(status);
  }

  @Patch(':id')
  @Role('ADMIN')
  async updateUser(@Body() updateUserDto: any, @Param('id') id: string) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Role('ADMIN')
  async deleteUser(@Param('id') id: string, @Req() req: RequestWithUser) {
    return await this.usersService.remove(req.user.id, id);
  }
}
