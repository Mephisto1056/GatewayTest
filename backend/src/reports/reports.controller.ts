import { Controller, Post, Param, Get, Body, UseGuards, Request, Res, HttpException, HttpStatus, Delete } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Report } from './entities/report.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Post('generate/personal/:userId')
  async generatePersonalReport(@Param('userId') userId: string): Promise<{
    success: boolean;
    message: string;
    report?: Report;
  }> {
    try {
      const report = await this.reportsService.generatePersonalReport(+userId);
      return {
        success: true,
        message: '个人报告生成成功',
        report,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '生成个人报告失败',
      };
    }
  }

  @Post('generate/360degree/:userId')
  async generate360DegreeReport(@Param('userId') userId: string): Promise<{
    success: boolean;
    message: string;
    report?: Report;
  }> {
    try {
      const report = await this.reportsService.generate360DegreeReport(+userId);
      return {
        success: true,
        message: '360度评估报告生成成功',
        report,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '生成360度评估报告失败',
      };
    }
  }

  @Post('generate/organization/:orgId')
  generateOrganizationReport(@Param('orgId') orgId: string): Promise<Report> {
    return this.reportsService.generateOrganizationReport(+orgId);
  }

  @Get()
  findAll(): Promise<Report[]> {
    return this.reportsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Report | null> {
    return this.reportsService.findOne(+id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.reportsService.remove(+id);
      return {
        success: true,
        message: '报告删除成功',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '删除报告失败',
      };
    }
  }

  @Get(':id/comprehensive')
  async getComprehensiveReport(@Param('id') id: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const report = await this.reportsService.findOne(+id);
      if (!report) {
        return {
          success: false,
          message: '报告不存在',
        };
      }

      return {
        success: true,
        message: '获取报告成功',
        data: {
          id: report.id,
          userId: report.userId,
          type: report.type,
          generatedAt: report.generatedAt,
          comprehensiveReport: report.dataJson,
          aiAnalysis: report.aiAnalysis,
          fileUrl: report.fileUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取报告失败',
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-report/latest')
  async getMyLatestReport(@Request() req): Promise<{
    success: boolean;
    message: string;
    report?: Report;
  }> {
    try {
      const userId = req.user.userId;
      const reports = await this.reportsService.getUserReports(userId);
      const latestReport = reports.length > 0 ? reports[0] : undefined;

      return {
        success: true,
        message: latestReport ? '获取最新报告成功' : '用户暂无报告',
        report: latestReport,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || '获取用户报告失败',
      };
    }
  }

  @Get('download/:id')
  async downloadPdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      const report = await this.reportsService.findOne(+id);
      if (!report) {
        throw new HttpException('报告不存在', HttpStatus.NOT_FOUND);
      }

      // 生成PDF
      const pdfBuffer = await this.reportsService.generatePdfBuffer(report.dataJson, report.aiAnalysis);

      // 设置响应头
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report_${report.userId}_${Date.now()}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // 发送PDF文件
      res.send(pdfBuffer);
    } catch (error) {
      throw new HttpException(
        error.message || '下载PDF失败',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('download-with-chart/:userId')
  async downloadPdfWithChart(
    @Param('userId') userId: string,
    @Body() body: { chartImage: string },
    @Res() res: Response
  ): Promise<void> {
    try {
      // 获取用户最新的报告
      const reports = await this.reportsService.getUserReports(+userId);
      const report = reports.length > 0 ? reports[0] : undefined;

      if (!report) {
        throw new HttpException('报告不存在', HttpStatus.NOT_FOUND);
      }

      // 生成PDF（带图表）
      const pdfBuffer = await this.reportsService.generatePdfBuffer(
        report.dataJson,
        report.aiAnalysis,
        body.chartImage
      );

      // 设置响应头
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report_${report.userId}_${Date.now()}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // 发送PDF文件
      res.send(pdfBuffer);
    } catch (error) {
      throw new HttpException(
        error.message || '下载PDF失败',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
