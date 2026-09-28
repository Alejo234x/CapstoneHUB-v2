import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
} from '@nestjs/class-validator';
import { ReportContentKind, ReportStatus } from '../generated/prisma/client';

export const MAX_REPORT_TEXT_LENGTH = 20_000;

export const REPORT_TYPES = [
  ReportContentKind.text,
  ReportContentKind.link,
  ReportContentKind.image,
  ReportContentKind.video,
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

export class PresignReportFileContentDto {
  @ApiProperty({
    description: 'File content type',
    enum: [
      ReportContentKind.image,
      ReportContentKind.video,
      ReportContentKind.file,
    ],
  })
  @IsIn([
    ReportContentKind.image,
    ReportContentKind.video,
    ReportContentKind.file,
  ])
  kind!: Extract<ReportContentKind, 'image' | 'video' | 'file'>;

  @ApiProperty({ description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ description: 'Declared MIME type' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(127)
  mimeType!: string;

  @ApiProperty({ description: 'Declared file size in bytes' })
  @IsInt()
  @Min(1)
  sizeBytes!: number;
}

export class ConfirmReportFileContentDto extends PresignReportFileContentDto {
  @ApiProperty({ description: 'Storage key returned by the presign endpoint' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  storageKey!: string;
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

// Se mantiene para la firma del endpoint de envío aunque ya no reciba datos.
export class SubmitReportDto {}
