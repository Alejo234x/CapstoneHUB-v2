import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 100;

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Número de página (1-based)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: `Elementos por página (máx ${MAX_PAGE_SIZE})`,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @IsOptional()
  limit?: number;
}

/** `skip`/`take` derivados de los parámetros de paginación. */
export function paginationToSkipTake(pagination: PaginationQueryDto): {
  skip?: number;
  take?: number;
} {
  const limit = pagination.limit ?? DEFAULT_PAGE_SIZE;
  const page = pagination.page ?? 1;

  return { skip: (page - 1) * limit, take: limit };
}
