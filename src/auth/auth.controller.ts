import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { JwtAuthGuard } from './auth.guard';
import { Public } from './decorators/public.decorator';
import type { Request, Response } from 'express';
import type { AppRole } from './decorators/role.decorator';
import { AuthGuard } from '@nestjs/passport';

export interface RequestWithUser extends Request {
  user: { id: string; email: string; name: string; role: AppRole };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  // @Public()
  // @Post('signin')
  // async signIn(@Body() signInDto: SignInDto, @Res({ passthrough: true }) res: Response) {
  //   const { accessToken, refreshToken, user } = await this.authService.signIn(signInDto);

  //   this.setCookies(res, accessToken, refreshToken);
  //   return { user };
  // }

  @Public()
  @Post('signin')
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.signIn(signInDto);

    this.setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;

    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Token refreshed' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: RequestWithUser) {
    const user = await this.authService.getProfile(req.user.id);
    return user;
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  async signOut(
    @Res({ passthrough: true }) res: Response,
    @Req() req: RequestWithUser,
  ) {
    await this.authService.signOut(req.user.id);
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/auth/refresh' });
    return { message: 'Signed out successfully' };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() { email }: { email: string }) {
    await this.authService.forgotPassword(email);
    return { message: 'Email sent successfully' };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body()
    { token, password }: { token: string; password: string },
  ) {
    await this.authService.resetPassword(token, password);
    return { message: 'Password reset successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Req() req: RequestWithUser,
    @Body()
    {
      currentPassword,
      newPassword,
    }: { currentPassword: string; newPassword: string },
  ) {
    await this.authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
    );
    return { message: 'Password changed successfully' };
  }
}
