import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProjectStatus } from '../../generated/prisma/client';

export class TransitionProjectStatusDTO {
  @ApiProperty({ description: 'Estado destino', enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  @IsNotEmpty()
  status!: ProjectStatus;

  @ApiPropertyOptional({ description: 'Motivo del cambio de estado' })
  @IsString()
  @IsOptional()
  @MaxLength(20_000)
  description?: string;
}
