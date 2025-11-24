import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { QuestionSelfdirected } from '../questionnaires/entities/question-selfdirected.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function importSelfdirectedQuestions() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const questionRepo = app.get<Repository<QuestionSelfdirected>>(
    getRepositoryToken(QuestionSelfdirected)
  );

  try {
    // 读取CSV文件
    const csvPath = path.join(__dirname, '../../../questionlist/question_selfdirected.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // 跳过表头，从第二行开始处理
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 跳过空行
      
      // 简单的CSV解析（假设没有引号包围的逗号）
      const columns = line.split(',');
      if (columns.length < 5) continue; // 确保有足够的列
      
      const question = new QuestionSelfdirected();
      question.evaluationDimension = columns[0]?.trim() || '';
      question.indicatorMeaning = columns[1]?.trim() || '';
      question.questionCode = columns[2]?.trim() || '';
      question.questionText = columns[3]?.trim() || '';
      question.scoringRule = columns[4]?.trim() || undefined;
      
      // 保存到数据库
      await questionRepo.save(question);
      console.log(`导入问题: ${question.questionCode} - ${question.questionText.substring(0, 50)}...`);
    }
    
    console.log('自主导向问题导入完成！');
  } catch (error) {
    console.error('导入过程中出现错误:', error);
  } finally {
    await app.close();
  }
}

// 运行导入脚本
importSelfdirectedQuestions();