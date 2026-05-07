import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('前台公开API')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get('articles')
  @ApiOperation({ summary: '获取已发布文章列表（分页）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'tagId', required: false, type: Number })
  getPublishedArticles(
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
    @Query('categoryId', ParseIntPipe) categoryId?: number,
    @Query('tagId', ParseIntPipe) tagId?: number,
  ) {
    return this.publicService.getPublishedArticles({
      page,
      limit,
      categoryId,
      tagId,
    });
  }

  @Public()
  @Get('articles/:id')
  @ApiOperation({ summary: '获取已发布文章详情' })
  getPublishedArticle(@Param('id', ParseIntPipe) id: number) {
    return this.publicService.getPublishedArticleById(id);
  }

  @Public()
  @Get('articles/:id/related')
  @ApiOperation({ summary: '获取相关文章' })
  getRelatedArticles(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    return this.publicService.getRelatedArticles(id, limit || 5);
  }

  @Public()
  @Get('categories/tree')
  @ApiOperation({ summary: '获取分类树' })
  getCategoriesTree() {
    return this.publicService.getCategoriesTree();
  }

  @Public()
  @Get('tags/hot')
  @ApiOperation({ summary: '获取热门标签' })
  getPopularTags(@Query('limit', ParseIntPipe) limit?: number) {
    return this.publicService.getPopularTags(limit || 20);
  }
}
