import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { ArticlesService } from "./articles.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { Role, ArticleStatus } from "@prisma/client";

@ApiTags("文章管理")
@Controller("articles")
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取文章列表" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "categoryId", required: false, type: Number })
  @ApiQuery({ name: "tagId", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: ArticleStatus })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  findAll(
    @Query("page", ParseIntPipe) page?: number,
    @Query("limit", ParseIntPipe) limit?: number,
    @Query("categoryId", ParseIntPipe) categoryId?: number,
    @Query("tagId", ParseIntPipe) tagId?: number,
    @Query("status") status?: ArticleStatus,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Request() req?: any,
  ) {
    return this.articlesService.findAll({
      page,
      limit,
      categoryId,
      tagId,
      status,
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      authorId: req?.user?.role === Role.EDITOR ? req.user.id : undefined,
    });
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取单个文章详情" })
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Query("includeVersions") includeVersions?: string,
  ) {
    return this.articlesService.findOne(id, includeVersions === "true");
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: "创建文章" })
  create(
    @Body()
    data: {
      title: string;
      summary?: string;
      coverImage?: string;
      content?: string;
      categoryId?: number;
      tagIds?: number[];
      customSlug?: string;
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string;
      status?: ArticleStatus;
    },
    @Request() req,
  ) {
    return this.articlesService.create(data, req.user.id);
  }

  @Put(":id")
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: "更新文章" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body()
    data: {
      title?: string;
      summary?: string;
      coverImage?: string;
      content?: string;
      categoryId?: number;
      tagIds?: number[];
      customSlug?: string;
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string;
      status?: ArticleStatus;
      changeMessage?: string;
    },
    @Request() req,
  ) {
    const allowedFields = [
      "title",
      "summary",
      "coverImage",
      "content",
      "categoryId",
      "tagIds",
      "customSlug",
      "metaTitle",
      "metaDescription",
      "metaKeywords",
      "status",
      "changeMessage",
    ];
    const filteredData: any = {};
    for (const field of allowedFields) {
      if (field in data) {
        filteredData[field] = (data as any)[field];
      }
    }
    return this.articlesService.update(
      id,
      filteredData,
      req.user.id,
      req.user.role,
    );
  }

  @Put(":id/submit")
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: "提交审核" })
  submitForReview(@Param("id", ParseIntPipe) id: number, @Request() req) {
    return this.articlesService.submitForReview(id, req.user.id);
  }

  @Put(":id/approve")
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "审核通过并发布（管理员）" })
  approve(@Param("id", ParseIntPipe) id: number, @Request() req) {
    return this.articlesService.approve(id, req.user.id);
  }

  @Put(":id/reject")
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "驳回文章（管理员）" })
  reject(
    @Param("id", ParseIntPipe) id: number,
    @Body("reason") reason: string,
    @Request() req,
  ) {
    return this.articlesService.reject(id, reason, req.user.id);
  }

  @Put(":id/archive")
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: "下架文章" })
  archive(@Param("id", ParseIntPipe) id: number, @Request() req) {
    return this.articlesService.archive(id, req.user.id, req.user.role);
  }

  @Get(":id/versions")
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取文章历史版本列表" })
  getVersions(@Param("id", ParseIntPipe) id: number) {
    return this.articlesService.getVersions(id);
  }

  @Get(":id/versions/:versionNumber")
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取指定版本详情" })
  getVersion(
    @Param("id", ParseIntPipe) id: number,
    @Param("versionNumber", ParseIntPipe) versionNumber: number,
  ) {
    return this.articlesService.getVersion(id, versionNumber);
  }

  @Put(":id/rollback/:versionNumber")
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: "回滚到指定版本" })
  rollbackToVersion(
    @Param("id", ParseIntPipe) id: number,
    @Param("versionNumber", ParseIntPipe) versionNumber: number,
    @Request() req,
  ) {
    return this.articlesService.rollbackToVersion(
      id,
      versionNumber,
      req.user.id,
      req.user.role,
    );
  }

  @Get(":id/related")
  @Public()
  @ApiOperation({ summary: "获取相关文章（公开）" })
  getRelatedArticles(
    @Param("id", ParseIntPipe) id: number,
    @Query("limit", ParseIntPipe) limit?: number,
  ) {
    return this.articlesService.getRelatedArticles(id, limit || 5);
  }

  @Get("published/:id")
  @Public()
  @ApiOperation({ summary: "获取已发布文章详情（公开）" })
  getPublishedArticle(@Param("id", ParseIntPipe) id: number) {
    return this.articlesService.getPublishedArticleById(id);
  }
}
