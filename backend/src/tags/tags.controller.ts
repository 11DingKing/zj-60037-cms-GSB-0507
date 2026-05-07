import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';

@ApiTags('标签管理')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取所有标签（公开）' })
  findAll() {
    return this.tagsService.findAll();
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: '获取热门标签（公开）' })
  getPopularTags(@Query('limit', ParseIntPipe) limit?: number) {
    return this.tagsService.getPopularTags(limit || 20);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个标签' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: '创建标签' })
  create(@Body() data: { name: string; color?: string }) {
    return this.tagsService.create(data);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: '更新标签' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { name?: string; color?: string },
  ) {
    return this.tagsService.update(id, data);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '删除标签（管理员）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tagsService.remove(id);
  }
}
