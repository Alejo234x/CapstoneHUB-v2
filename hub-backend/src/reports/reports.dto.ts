import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from '@nestjs/class-validator';
import { ReportStatus } from '../generated/prisma/client';

export class CreateReportDto {
  @ApiProperty({ description: 'Report title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Report due date',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  dueDate!: Date;
}

export class UpdateReportDto {
  @ApiPropertyOptional({ description: 'Report title' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Report due date',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dueDate?: Date;
}

export class SubmitReportDto {
  @ApiPropertyOptional({
    description: 'Attachment ids to link to the report on submission',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  @IsOptional()
  attachmentIds?: number[];
}

export class ReviewReportDto {
  @ApiProperty({
    description: 'Review decision',
    enum: [ReportStatus.accepted, ReportStatus.rejected],
  })
  @IsIn([ReportStatus.accepted, ReportStatus.rejected])
  decision!: ReportStatus;

  @ApiPropertyOptional({ description: 'Optional review comment' })
  @IsString()
  @IsOptional()
  comment?: string;
}
