import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { EvaluationParticipant, ParticipantStatus } from '../evaluations/entities/evaluation-participant.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const evaluationRepo = app.get<Repository<Evaluation>>(getRepositoryToken(Evaluation));
  const participantRepo = app.get<Repository<EvaluationParticipant>>(getRepositoryToken(EvaluationParticipant));

  console.log('Starting backfill of nomination tasks...');

  // Fetch all evaluations
  const evaluations = await evaluationRepo.find();
  console.log(`Found ${evaluations.length} evaluations.`);

  let count = 0;

  for (const evaluation of evaluations) {
    // Check if nomination task exists
    const nominationTask = await participantRepo.findOne({
      where: {
        evaluationId: evaluation.id,
        participantId: evaluation.userId,
        relationship: '提名',
      }
    });

    if (!nominationTask) {
      // Check if any nominations have already been made (i.e., participants other than self exist)
      // If so, mark as completed. Otherwise, pending.
      const otherParticipantsCount = await participantRepo.count({
        where: {
          evaluationId: evaluation.id,
          relationship: '上级' // Checking for any relationship that implies nomination done
        }
      });
      
      // Also check peers, subordinates if needed, but checking '上级' (Superior) or any non-self relationship is a good proxy
      // Actually, easier to just check count of participants > 1 (assuming 1 is self)
      // But let's keep it simple: if any non-self non-nomination participant exists
      
      const hasNominations = await participantRepo.createQueryBuilder('p')
        .where('p.evaluationId = :eid', { eid: evaluation.id })
        .andWhere('p.relationship NOT IN (:...rels)', { rels: ['自评', '提名'] })
        .getCount();

      const status = hasNominations > 0 ? ParticipantStatus.COMPLETED : ParticipantStatus.PENDING;

      await participantRepo.save({
        evaluationId: evaluation.id,
        participantId: evaluation.userId,
        relationship: '提名',
        status: status
      });
      
      count++;
      console.log(`Created nomination task for Evaluation #${evaluation.id} (Status: ${status})`);
    }
  }

  console.log(`Backfill completed. Created ${count} tasks.`);
  await app.close();
}

bootstrap();
