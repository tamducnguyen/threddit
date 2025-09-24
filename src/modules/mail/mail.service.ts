import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.transporter = createTransport({
      service: 'gmail',
      auth: {
        user: configService.get<string>('GMAILER'),
        pass: configService.get<string>('GMAILER_APP_PASSWORD'),
      },
    });

    console.log(__dirname);
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

  async sendEmail(
    toEmail: string,
    subject: string,
    html: string,
  ): Promise<boolean> {
    const message = {
      from: `"threddit" <${process.env.GMAILER}>`, // nên lấy từ config
      to: toEmail,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(message);
      return true;
    } catch {
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
