import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
//   let usersService: jest.Mocked<UsersService>;
//   let jwtService: jest.Mocked<JwtService>;
//   let mailService: jest.Mocked<MailService>;
//   let prismaService: jest.Mocked<PrismaService>;        

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService,
        { provide: UsersService, useValue: { findOneByEmail: jest.fn(), findOne: jest.fn(), findOneById: jest.fn() } },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        { provide: PrismaService, useValue: { user: { update: jest.fn(), findUnique: jest.fn() }, token: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() } } }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it("should generate a pair of tokens", async () => {
    (jwtService.signAsync as jest.Mock)
    .mockResolvedValueOnce('mock-access-token')
    .mockResolvedValueOnce('mock-refresh-token');

  const tokens = await service.genToken({ sub: '1', email: 'test@example.com', name: 'Test', role: 'ADMIN' });

  expect(tokens).toEqual({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  });
  })
});