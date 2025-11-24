import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('Email transporter initialized');
    } else {
      this.logger.warn('Email configuration missing. Email notifications will not be sent.');
    }
  }

  async sendEvaluationInvite(
    to: string,
    participantName: string,
    evaluateeName: string,
    evaluationLink: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Cannot send invite to ${to}: Transporter not initialized`);
      return false;
    }

    const subject = `[组织领导力诊断系统] 360度评估邀请`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>评估邀请</h2>
        <p>尊敬的 ${participantName}:</p>
        <p>您被邀请参与对 <strong>${evaluateeName}</strong> 的360度领导力评估。</p>
        <p>您的反馈对我们的组织发展至关重要。请点击下方链接完成评估：</p>
        <p>
          <a href="${evaluationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            开始评估
          </a>
        </p>
        <p>或者复制以下链接到浏览器打开：</p>
        <p>${evaluationLink}</p>
        <br/>
        <p>感谢您的参与！</p>
        <p>组织领导力诊断系统团队</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_FROM') || '"Leadership System" <noreply@example.com>',
        to,
        subject,
        html,
      });
      this.logger.log(`Evaluation invite sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      return false;
    }
  }
}