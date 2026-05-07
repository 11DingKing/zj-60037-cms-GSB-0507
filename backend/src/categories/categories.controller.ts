import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role } from '@prisma/client';

@ApiTags('分类管理')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('tree')
  @Public()
  @ApiOperation({ summary: '获取分类树（公开）' })
  findAllTree() {
    return this.categoriesService.findAllTree();
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有分类列表' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取单个分类' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '创建分类（管理员）' })
  create(@Body() data: {
    name: string;
    slug: string;
    sortOrder?: number;
    parentId?: number;
  }) {
    return this.categoriesService.create(data);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '更新分类（管理员）' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: {
      name?: string;
      slug?: string;
      sortOrder?: number;
      parentId?: number;
    },
  ) {
    return this.categoriesService.update(id, data);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '删除分类（管理员）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
