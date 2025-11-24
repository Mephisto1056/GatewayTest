import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PublishBatchDto {
  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  userIds: number[];

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  questionnaireType: string;

  @IsString()
  status: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;
}
