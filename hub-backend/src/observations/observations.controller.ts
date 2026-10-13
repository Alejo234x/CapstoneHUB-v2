import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  ObservationsService,
  ProjectObservationResponse,
} from './observations.service';
import { CreateObservationDto } from './observations.dto';

@Controller('projects/:projectId/observations')
export class ObservationsController {
  constructor(private observationsService: ObservationsService) {}

  @Get()
  async getProjectObservations(
    @Param('projectId', ParseIntPipe) projectId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectObservationResponse[]> {
    return this.observationsService.observationsByProject(projectId, user);
  }

  @Post()
  async createProjectObservation(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() data: CreateObservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectObservationResponse> {
    return this.observationsService.createObservation({
      projectId,
      content: data.content,
      user,
    });
  }
}
