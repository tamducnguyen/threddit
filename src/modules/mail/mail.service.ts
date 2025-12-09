import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  transporter: nodemailer.Transporter;
  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.getOrThrow<string>('GMAIL_USER'),
        pass: this.configService.getOrThrow<string>('GMAIL_APP_PASSWORD'),
      },
    });
    Handlebars.registerPartial(
      'header',
      fs.readFileSync(
        path.join(__dirname, 'templates', 'layout', 'header.hbs'),
        'utf8',
      ),
    );
    Handlebars.registerPartial(
      'footer',
      fs.readFileSync(
        path.join(__dirname, 'templates', 'layout', 'footer.hbs'),
        'utf8',
      ),
    );
  }
  private compileTemplate(templatePath: string, context: any): string {
    const fullPath = path.join(__dirname, 'templates', templatePath);
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const template = Handlebars.compile(fileContent);
    return template(context);
  }

  private async sendEmail(
    toEmail: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    const fromEmail = this.configService.getOrThrow<string>('GMAIL_USER');
    const msg: nodemailer.SendMailOptions = {
      to: toEmail,
      from: `Threddit <${fromEmail}>`,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(msg);
      return true;
    } catch (error) {
      console.error('Send mail error:', error);
      return false;
    }
  }

  async sendVerifyCode(toEmail: string, verifyCode: string): Promise<boolean> {
    const htmlWelcome = this.compileTemplate('content/welcome.hbs', {
      name: toEmail,
      code: verifyCode,
    });
    const subject = 'Xác minh tài khoản';
    return await this.sendEmail(toEmail, subject, htmlWelcome);
  }
  async sendForgotPassword(
    toEmail: string,
    verifyCode: string,
  ): Promise<boolean> {
    const htmlWelcome = this.compileTemplate('content/forgotpassword.hbs', {
      name: toEmail,
      code: verifyCode,
    });
    const subject = 'Đặt lại mật khẩu';
    return await this.sendEmail(toEmail, subject, htmlWelcome);
  }
}
