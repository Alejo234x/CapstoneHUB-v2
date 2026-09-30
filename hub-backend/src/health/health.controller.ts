import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sonda de disponibilidad: comprueba la conexión a la base de datos. Es
   * pública para que la puedan usar los healthchecks de infraestructura.
   */
  @Public()
  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return { status: 'ok' };
  }
}
