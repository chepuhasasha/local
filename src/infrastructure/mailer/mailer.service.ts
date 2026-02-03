import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

import type { AppConfig } from '@/config/configuration';
import { AppLoggerService } from '@/infrastructure/observability/logger.service';

@Injectable()
export class MailerService {
  private readonly config: AppConfig['mailer'];
  private transporter: Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    const raw: unknown = this.configService.get('mailer', { infer: true });
    if (!raw || typeof raw !== 'object') {
      throw new Error('Mailer configuration is missing.');
    }
    this.config = raw as AppConfig['mailer'];
  }

  async sendOtpEmail(params: {
    to: string;
    code: string;
    expiresAt: Date;
  }): Promise<void> {
    const { to, code, expiresAt } = params;

    if (!this.isEnabled()) {
      this.logFallback(to, code, expiresAt);
      return;
    }

    const transporter = this.getTransporter();
    const subject = 'Код подтверждения входа';
    const text = `Ваш код: ${code}. Действителен до ${expiresAt.toISOString()}.`;

    await transporter.sendMail({
      from: this.config.from ?? undefined,
      to,
      subject,
      text,
    });
  }

  private isEnabled(): boolean {
    return Boolean(this.config.host && this.config.port && this.config.from);
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host ?? undefined,
        port: this.config.port ?? undefined,
        secure: this.config.secure ?? false,
        auth:
          this.config.user && this.config.password
            ? {
                user: this.config.user,
                pass: this.config.password,
              }
            : undefined,
      });
    }

    return this.transporter;
  }

  private logFallback(to: string, code: string, expiresAt: Date): void {
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        'Mailer не настроен. Отправка OTP в production запрещена.',
        undefined,
        'MailerService',
      );
      throw new Error('Mailer configuration is missing.');
    }

    this.logger.warn(
      `Mailer не настроен. OTP для ${to}: ${code} (до ${expiresAt.toISOString()}).`,
      'MailerService',
    );
  }
}
