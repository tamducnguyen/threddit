import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.getOrThrow<string>('SENDGRID_API_KEY'));
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
    const fromEmail = this.configService.getOrThrow<string>(
      'SENDGRID_FROM_EMAIL',
    );
    const msg = {
      to: toEmail,
      from: { email: fromEmail, name: 'Threddit' },
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('SendGrid error:', error);
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
