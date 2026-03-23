import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SignInDto } from './dto/sign-in.dto';
import * as bcrypt from 'bcrypt';

import {
  generateForgotPasswordToken,
  generateTemplateEmail,
  hashToken,
} from 'src/utils/utils';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtPayload } from './strategies/jwt.strategy';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly prismaService: PrismaService,
  ) {}

  async genToken(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(
      refreshToken,
      parseInt(process.env.SALT_ROUNDS as string) || 10,
    );
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  // async signIn(signInDto: SignInDto): Promise<{
  //   accessToken: string;
  //   user: { id: string; email: string; name: string; role: Role };
  // }> {
  //   const user = await this.usersService.findOneByEmail(signInDto.email);
  //   if (!user) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }

  //   if (user.status !== 'ACTIVE') {
  //     throw new UnauthorizedException('User account is not active');
  //   }

  //   const isPasswordValid = await bcrypt.compare(
  //     signInDto.password,
  //     user.password,
  //   );
  //   if (!isPasswordValid) {
  //     throw new UnauthorizedException('Invalid credentials');
  //   }

  //   const payload = {
  //     sub: user.id,
  //     email: user.email,
  //     name: user.name,
  //     role: user.role,
  //   };

  //   return {
  //     accessToken: await this.jwtService.signAsync(payload),
  //     user: {
  //       id: user.id,
  //       email: user.email,
  //       name: user.name,
  //       role: user.role,
  //     },
  //   };
  // }

  async signIn(signInDto: SignInDto) {
    const user = await this.usersService.findOneByEmail(signInDto.email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Invalid credentials or inactive account',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      signInDto.password,
      user.password,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const tokens = await this.genToken(payload);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.status !== 'ACTIVE' || !user.refreshToken)
      throw new UnauthorizedException('Access Denied');


    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenMatches) throw new UnauthorizedException('Access Denied');

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const tokens = await this.genToken(payload);

    // Update RT mới vào DB (Refresh Token Rotation)
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async signOut(userId: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getProfile(id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { resetToken, hashedToken } = generateForgotPasswordToken();

    await this.prismaService.token.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const message = generateTemplateEmail(resetToken);
    const sub = `Adhub Dns System - Reset your password`;

    this.mailService.sendMail(user.email, sub, message);

    return { message: 'Email sent successfully' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = hashToken(token);
    const tokenRecord = await this.prismaService.token.findMany({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!tokenRecord.length) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = tokenRecord[0].user;
    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.SALT_ROUNDS as string) || 10,
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.prismaService.token.deleteMany({
      where: { userId: user.id },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.SALT_ROUNDS as string) || 10,
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  }
}
