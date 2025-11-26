import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { EvaluationParticipant } from '../evaluations/entities/evaluation-participant.entity';
import { EvaluationResponse } from '../evaluations/entities/evaluation-response.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const userRepository = dataSource.getRepository(User);
  const evaluationRepository = dataSource.getRepository(Evaluation);
  const participantRepository = dataSource.getRepository(EvaluationParticipant);
  const responseRepository = dataSource.getRepository(EvaluationResponse);

  try {
    // 1. Delete all evaluation responses
    await responseRepository.createQueryBuilder().delete().execute();
    console.log('Deleted all evaluation responses.');

    // 2. Delete all evaluation participants
    await participantRepository.createQueryBuilder().delete().execute();
    console.log('Deleted all evaluation participants.');

    // 3. Delete all evaluations
    await evaluationRepository.createQueryBuilder().delete().execute();
    console.log('Deleted all evaluations.');

    // 4. Find all users except admin
    const usersToDelete = await userRepository.createQueryBuilder('user')
      .where('user.email != :adminEmail', { adminEmail: 'admin@gateway.com' })
      .getMany();

    if (usersToDelete.length > 0) {
      console.log(`Found ${usersToDelete.length} users to delete.`);
      await userRepository.remove(usersToDelete);
      console.log('Successfully deleted dirty user data.');
    } else {
      console.log('No users found to delete (admin user preserved).');
    }
  } catch (error) {
    console.error('Error cleaning up data:', error);
  }

  await app.close();
}

bootstrap();
