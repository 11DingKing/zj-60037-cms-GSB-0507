import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('看板数据')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: '获取看板概览数据' })
  getOverview() {
    return this.dashboardService.getRecentArticlesOverview();
  }

  @Get('statistics')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: '获取文章统计数据' })
  getStatistics() {
    return this.dashboardService.getStatistics();
  }

  @Get('publish-trend')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: '获取发布趋势' })
  getPublishTrend(@Query('days', ParseIntPipe) days?: number) {
    return this.dashboardService.getPublishTrend(days || 30);
  }

  @Get('category-stats')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: '获取分类文章统计' })
  getCategoryStats() {
    return this.dashboardService.getCategoryStats();
  }

  @Get('popular-tags')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: '获取热门标签' })
  getPopularTags(@Query('limit', ParseIntPipe) limit?: number) {
    return this.dashboardService.getPopularTags(limit || 15);
  }
}
