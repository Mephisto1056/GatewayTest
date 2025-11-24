import { IsArray, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class Nominator {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsNotEmpty()
  relationship: '上级' | '平级' | '下级';
}

export class NominateEvaluatorsDto {
  @IsInt()
  @IsNotEmpty()
  evaluationId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Nominator)
  nominators: Nominator[];
}