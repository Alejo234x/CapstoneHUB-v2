import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const MAX_OBSERVATION_LENGTH = 20_000;

export class CreateObservationDto {
  @ApiProperty({ description: 'Contenido de la observación' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_OBSERVATION_LENGTH)
  content!: string;
}
