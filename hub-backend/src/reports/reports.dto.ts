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
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ReportContentKind, ReportStatus } from '../generated/prisma/client';

export const MAX_REPORT_TEXT_LENGTH = 20_000;

export const REPORT_TYPES = [
  ReportContentKind.text,
  ReportContentKind.link,
  ReportContentKind.file,
];

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

  @ApiProperty({
    description: 'Delivery type; defines what the student must provide',
    enum: REPORT_TYPES,
  })
  @IsIn(REPORT_TYPES)
  type!: ReportContentKind;

  @ApiPropertyOptional({
    description:
      'Allowed MIME types for file content (required for image/video/file)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedMimeTypes?: string[];

  @ApiPropertyOptional({
    description:
      'Maximum number of file contents (required for image/video/file)',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxFiles?: number;
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

  @ApiPropertyOptional({
    description: 'Delivery type; only changeable while the report is empty',
    enum: REPORT_TYPES,
  })
  @IsIn(REPORT_TYPES)
  @IsOptional()
  type?: ReportContentKind;

  @ApiPropertyOptional({
    description:
      'Allowed MIME types for file content (required for image/video/file)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedMimeTypes?: string[];

  @ApiPropertyOptional({
    description:
      'Maximum number of file contents (required for image/video/file)',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxFiles?: number;
}

export class CreateReportContentDto {
  @ApiProperty({
    description: 'Content type',
    enum: [ReportContentKind.text, ReportContentKind.link],
  })
  @IsIn([ReportContentKind.text, ReportContentKind.link])
  kind!: Extract<ReportContentKind, 'text' | 'link'>;

  @ApiPropertyOptional({ description: 'Body of a text content' })
  @ValidateIf(
    (dto: CreateReportContentDto) => dto.kind === ReportContentKind.text,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_REPORT_TEXT_LENGTH)
  textContent?: string;

  @ApiPropertyOptional({ description: 'URL of a link content' })
  @ValidateIf(
    (dto: CreateReportContentDto) => dto.kind === ReportContentKind.link,
  )
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional({ description: 'Optional label for a link content' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string;
}

export class UpdateReportContentDto {
  @ApiPropertyOptional({ description: 'Body of a text content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_REPORT_TEXT_LENGTH)
  @IsOptional()
  textContent?: string;

  @ApiPropertyOptional({ description: 'URL of a link content' })
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Optional label for a link content' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  label?: string;
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
