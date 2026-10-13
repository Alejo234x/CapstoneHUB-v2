import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { UserRole } from '../../generated/prisma/client';
import { NewUserDto } from './new-user.dto';

export class CreateUserDto extends NewUserDto {
  @ApiProperty({ enum: UserRole, isArray: true })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles!: UserRole[];
}
