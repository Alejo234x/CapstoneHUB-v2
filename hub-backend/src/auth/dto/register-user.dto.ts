import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from '@nestjs/class-validator';

/** Recorta los espacios de los campos de texto antes de validarlos. */
function trimWhitespace({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RegisterUserDto {
  @ApiProperty({ description: 'full name of the user' })
  @IsString()
  @IsNotEmpty()
  @Transform(trimWhitespace)
  fullName!: string;

  @ApiProperty({ description: 'email address of the user' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(trimWhitespace)
  email!: string;

  @ApiProperty({ description: 'password for the new user' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;
}
