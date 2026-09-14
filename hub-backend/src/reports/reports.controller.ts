import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  CreateReportDto,
  ReviewReportDto,
  SubmitReportDto,
  UpdateReportDto,
} from './reports.dto';
import { ProjectReportResponse, ReportsService } from './reports.service';

@Controller('projects/:projectId/reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getProjectReports(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectReportResponse[]> {
    return this.reportsService.reportsByProject(Number(projectId), user);
  }

  @Post()
  createProjectReport(
    @Param('projectId') projectId: string,
    @Body() data: CreateReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectReportResponse> {
    return this.reportsService.createReport({
      projectId: Number(projectId),
      data,
      user,
    });
  }

  @Patch(':reportId')
  updateProjectReport(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Body() data: UpdateReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectReportResponse> {
    return this.reportsService.updateReport({
      projectId: Number(projectId),
      reportId: Number(reportId),
      data,
      user,
    });
  }

  @Delete(':reportId')
  deleteProjectReport(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectReportResponse> {
    return this.reportsService.deleteReport({
      projectId: Number(projectId),
      reportId: Number(reportId),
      user,
    });
  }

  @Post(':reportId/submit')
  submitProjectReport(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Body() data: SubmitReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectReportResponse> {
    return this.reportsService.submitReport({
      projectId: Number(projectId),
      reportId: Number(reportId),
      data,
      user,
    });
  }

  @Post(':reportId/review')
  reviewProjectReport(
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
    @Body() data: ReviewReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectReportResponse> {
    return this.reportsService.reviewReport({
      projectId: Number(projectId),
      reportId: Number(reportId),
      data,
      user,
    });
  }
}
