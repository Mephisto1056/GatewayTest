import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { QuestionSelfdirected } from '../questionnaires/entities/question-selfdirected.entity';
import { QuestionHighleveltest } from '../questionnaires/entities/question-highleveltest.entity';
import { QuestionLowleveltest } from '../questionnaires/entities/question-lowleveltest.entity';
import { QuestionMediumleveltest } from '../questionnaires/entities/question-mediumleveltest.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function importAllQuestions() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const selfdirectedRepo = app.get<Repository<QuestionSelfdirected>>(
    getRepositoryToken(QuestionSelfdirected)
  );
  const highlevelRepo = app.get<Repository<QuestionHighleveltest>>(
    getRepositoryToken(QuestionHighleveltest)
  );
  const lowlevelRepo = app.get<Repository<QuestionLowleveltest>>(
    getRepositoryToken(QuestionLowleveltest)
  );
  const mediumlevelRepo = app.get<Repository<QuestionMediumleveltest>>(
    getRepositoryToken(QuestionMediumleveltest)
  );

  try {
    console.log('开始导入所有问题...');

    // 导入自主导向问题
    await importSelfdirectedQuestions(selfdirectedRepo);
    
    // 导入高层测试问题
    await importHighleveltestQuestions(highlevelRepo);
    
    // 导入基层测试问题
    await importLowleveltestQuestions(lowlevelRepo);
    
    // 导入中层测试问题
    await importMediumleveltestQuestions(mediumlevelRepo);
    
    console.log('所有问题导入完成！');
  } catch (error) {
    console.error('导入过程中出现错误:', error);
  } finally {
    await app.close();
  }
}

const questionListPath = process.env.QUESTION_LIST_PATH || path.join(__dirname, '../../../questionlist');

async function importSelfdirectedQuestions(repo: Repository<QuestionSelfdirected>) {
  console.log('导入自主导向问题...');
  const csvPath = path.join(questionListPath, 'question_selfdirected.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    if (columns.length < 5) continue;
    
    const questionCode = columns[2]?.trim() || '';
    let question = await repo.findOne({ where: { questionCode } });
    
    if (!question) {
      question = new QuestionSelfdirected();
      question.questionCode = questionCode;
    }

    question.evaluationDimension = columns[0]?.trim() || '';
    question.indicatorMeaning = columns[1]?.trim() || '';
    question.questionText = columns[3]?.trim() || '';
    question.scoringRule = columns[4]?.trim() || undefined;
    
    await repo.save(question);
    console.log(`导入自主导向问题: ${question.questionCode} (已${question.id ? '更新' : '创建'})`);
  }
}

async function importHighleveltestQuestions(repo: Repository<QuestionHighleveltest>) {
  console.log('导入高层测试问题...');
  const csvPath = path.join(questionListPath, 'question_highleveltest.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    if (columns.length < 6) continue;
    
    const questionCode = columns[4]?.trim() || '';
    let question = await repo.findOne({ where: { questionCode } });

    if (!question) {
      question = new QuestionHighleveltest();
      question.questionCode = questionCode;
    }

    question.userLevel = columns[0]?.trim() || '';
    question.evaluationDimension = columns[1]?.trim() || '';
    question.indicatorMeaning = columns[2]?.trim() || '';
    question.evaluationSubDimension = columns[3]?.trim() || '';
    question.questionText = columns[5]?.trim() || '';
    question.relevance = columns[6]?.trim() || undefined;
    question.scoringRule = columns[7]?.trim() || undefined;
    
    await repo.save(question);
    console.log(`导入高层测试问题: ${question.questionCode} (已${question.id ? '更新' : '创建'})`);
  }
}

async function importLowleveltestQuestions(repo: Repository<QuestionLowleveltest>) {
  console.log('导入基层测试问题...');
  const csvPath = path.join(questionListPath, 'question_lowleveltest.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    if (columns.length < 6) continue;
    
    const questionCode = columns[4]?.trim() || '';
    let question = await repo.findOne({ where: { questionCode } });

    if (!question) {
      question = new QuestionLowleveltest();
      question.questionCode = questionCode;
    }

    question.userLevel = columns[0]?.trim() || '';
    question.evaluationDimension = columns[1]?.trim() || '';
    question.indicatorMeaning = columns[2]?.trim() || '';
    question.evaluationSubDimension = columns[3]?.trim() || '';
    question.questionText = columns[5]?.trim() || '';
    question.relevance = columns[6]?.trim() || undefined;
    question.scoringRule = columns[7]?.trim() || undefined;
    
    await repo.save(question);
    console.log(`导入基层测试问题: ${question.questionCode} (已${question.id ? '更新' : '创建'})`);
  }
}

async function importMediumleveltestQuestions(repo: Repository<QuestionMediumleveltest>) {
  console.log('导入中层测试问题...');
  const csvPath = path.join(questionListPath, 'question_mediumleveltest.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    if (columns.length < 6) continue;
    
    const questionCode = columns[4]?.trim() || '';
    let question = await repo.findOne({ where: { questionCode } });

    if (!question) {
      question = new QuestionMediumleveltest();
      question.questionCode = questionCode;
    }

    question.userLevel = columns[0]?.trim() || '';
    question.evaluationDimension = columns[1]?.trim() || '';
    question.indicatorMeaning = columns[2]?.trim() || '';
    question.evaluationSubDimension = columns[3]?.trim() || '';
    question.questionText = columns[5]?.trim() || '';
    question.relevance = columns[6]?.trim() || undefined;
    question.scoringRule = columns[7]?.trim() || undefined;
    
    await repo.save(question);
    console.log(`导入中层测试问题: ${question.questionCode} (已${question.id ? '更新' : '创建'})`);
  }
}

// 运行导入脚本
importAllQuestions();