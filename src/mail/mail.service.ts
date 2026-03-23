import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodeMailer from 'nodemailer';

@Injectable()
export class MailService {
  async sendMail(to: string, subject: string, text: string) {
    try {
      const transporter = nodeMailer.createTransport({
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT as string),
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
      });
      return await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        html: text,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        error.message || 'Failed to send email',
      );
    }
  }
}
