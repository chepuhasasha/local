import nodemailer from 'nodemailer';

import { MailerService } from '@/infrastructure/mailer/mailer.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('MailerService', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  it('throws when mailer config missing', () => {
    const configService = { get: jest.fn(() => null) };
    const logger = { warn: jest.fn(), error: jest.fn() };

    expect(() => new MailerService(configService as any, logger as any)).toThrow(
      'Mailer configuration is missing.',
    );
  });

  it('logs fallback and skips sending when disabled in dev', async () => {
    const configService = { get: jest.fn(() => ({ host: null, port: null, from: null })) };
    const logger = { warn: jest.fn(), error: jest.fn() };
    process.env.NODE_ENV = 'test';

    const service = new MailerService(configService as any, logger as any);

    await service.sendOtpEmail({
      to: 'user@example.com',
      code: '123456',
      expiresAt: new Date('2024-01-01T00:00:00Z'),
    });

    expect(logger.warn).toHaveBeenCalled();
    expect((nodemailer as any).createTransport).not.toHaveBeenCalled();
  });

  it('throws when disabled in production', async () => {
    const configService = { get: jest.fn(() => ({ host: null, port: null, from: null })) };
    const logger = { warn: jest.fn(), error: jest.fn() };
    process.env.NODE_ENV = 'production';

    const service = new MailerService(configService as any, logger as any);

    await expect(
      service.sendOtpEmail({
        to: 'user@example.com',
        code: '123456',
        expiresAt: new Date('2024-01-01T00:00:00Z'),
      }),
    ).rejects.toThrow('Mailer configuration is missing.');

    expect(logger.error).toHaveBeenCalled();
  });

  it('sends email when enabled', async () => {
    const transporter = { sendMail: jest.fn().mockResolvedValue(true) };
    (nodemailer as any).createTransport.mockReturnValue(transporter);

    const configService = {
      get: jest.fn(() => ({
        host: 'smtp.local',
        port: 587,
        user: 'user',
        password: 'pass',
        from: 'noreply@example.com',
        secure: false,
      })),
    };
    const logger = { warn: jest.fn(), error: jest.fn() };

    const service = new MailerService(configService as any, logger as any);

    await service.sendOtpEmail({
      to: 'user@example.com',
      code: '123456',
      expiresAt: new Date('2024-01-01T00:00:00Z'),
    });

    expect((nodemailer as any).createTransport).toHaveBeenCalledTimes(1);
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'user@example.com',
      }),
    );
  });
});
