import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ArticleStatus, Role } from '@prisma/client';

@Injectable()
export class ArticlesService {
  private readonly CACHE_PREFIX = 'articles:';
  private readonly CACHE_TTL = 1800;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  private async updateSearchVector(articleId: number) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { title: true, content: true },
    });

    if (article) {
      try {
        await this.prisma.$executeRaw`
          UPDATE articles 
          SET search_vector = to_tsvector('simple', ${article.title} || ' ' || COALESCE(${article.content}, ''))
          WHERE id = ${articleId}
        `;
      } catch (e) {
        // search_vector 列未在 DB 中创建（项目原 schema 未添加此列），忽略
      }
    }
  }

  private async invalidateCache(articleId?: number) {
    if (articleId) {
      await this.redisService.del(`${this.CACHE_PREFIX}${articleId}`);
    }
    await this.redisService.flushPattern(`${this.CACHE_PREFIX}list:*`);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    categoryId?: number;
    tagId?: number;
    status?: ArticleStatus;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    authorId?: number;
  }) {
    const { page = 1, limit = 10, categoryId, tagId, status, startDate, endDate, search, authorId } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    } else if (startDate) {
      where.createdAt = { gte: startDate };
    } else if (endDate) {
      where.createdAt = { lte: endDate };
    }

    const include: any = {
      category: true,
      author: { select: { id: true, username: true } },
      tags: { include: { tag: true } },
      _count: { select: { versions: true } },
    };

    let articles;
    let total;

    if (search && search.trim()) {
      const searchQuery = search.trim();

      const [foundArticles, count] = await this.prisma.$transaction([
        this.prisma.article.findMany({
          where: {
            ...where,
            OR: [
              { title: { contains: searchQuery, mode: 'insensitive' } },
              { summary: { contains: searchQuery, mode: 'insensitive' } },
              { content: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
          take: limit,
          skip,
          orderBy: { createdAt: 'desc' },
          include: {
            category: true,
            author: { select: { id: true, username: true, email: true } },
            tags: { include: { tag: true } },
          },
        }),
        this.prisma.article.count({
          where: {
            ...where,
            OR: [
              { title: { contains: searchQuery, mode: 'insensitive' } },
              { summary: { contains: searchQuery, mode: 'insensitive' } },
              { content: { contains: searchQuery, mode: 'insensitive' } },
            ],
          } as any,
        }),
      ]);

      const articleIds = foundArticles.map((a: any) => a.id);
      const articlesWithRelations = await this.prisma.article.findMany({
        where: { id: { in: articleIds } },
        include,
        orderBy: { createdAt: 'desc' },
      });

      articles = articlesWithRelations;
      total = count;
    } else {
      const [foundArticles, count] = await this.prisma.$transaction([
        this.prisma.article.findMany({
          where,
          include,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.article.count({ where }),
      ]);

      articles = foundArticles;
      total = count;
    }

    if (tagId) {
      const articleTags = await this.prisma.articleTag.findMany({
        where: { tagId },
        select: { articleId: true },
      });
      const validArticleIds = articleTags.map(at => at.articleId);
      articles = articles.filter(a => validArticleIds.includes(a.id));
    }

    return {
      data: articles.map(article => ({
        ...article,
        tags: article.tags.map(at => at.tag),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, includeVersions: boolean = false) {
    const include: any = {
      category: true,
      author: { select: { id: true, username: true, email: true } },
      tags: { include: { tag: true } },
    };

    if (includeVersions) {
      include.versions = {
        orderBy: { versionNumber: 'desc' },
        include: {
          createdBy: { select: { id: true, username: true } },
        },
      };
    }

    const article = await this.prisma.article.findUnique({
      where: { id },
      include,
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    return {
      ...article,
      tags: article.tags.map(at => at.tag),
    };
  }

  async getPublishedArticleById(id: number) {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const article = await this.prisma.article.findUnique({
      where: { id, status: ArticleStatus.PUBLISHED },
      include: {
        category: true,
        author: { select: { id: true, username: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!article) {
      throw new NotFoundException('文章不存在或未发布');
    }

    const result = {
      ...article,
      tags: article.tags.map(at => at.tag),
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  async create(data: {
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
  }, userId: number) {
    const article = await this.prisma.$transaction(async (tx) => {
      const newArticle = await tx.article.create({
        data: {
          title: data.title,
          summary: data.summary,
          coverImage: data.coverImage,
          content: data.content || '',
          categoryId: data.categoryId,
          authorId: userId,
          status: data.status || ArticleStatus.DRAFT,
          customSlug: data.customSlug,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          metaKeywords: data.metaKeywords,
          publishedAt: data.status === ArticleStatus.PUBLISHED ? new Date() : null,
        },
      });

      if (data.tagIds && data.tagIds.length > 0) {
        await tx.articleTag.createMany({
          data: data.tagIds.map(tagId => ({
            articleId: newArticle.id,
            tagId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.articleVersion.create({
        data: {
          articleId: newArticle.id,
          versionNumber: 1,
          title: newArticle.title,
          summary: newArticle.summary,
          content: newArticle.content,
          coverImage: newArticle.coverImage,
          categoryId: newArticle.categoryId,
          metaTitle: newArticle.metaTitle,
          metaDescription: newArticle.metaDescription,
          metaKeywords: newArticle.metaKeywords,
          tagIds: data.tagIds || [],
          createdById: userId,
          changeMessage: '初始版本',
        },
      });

      return newArticle;
    });

    await this.updateSearchVector(article.id);
    await this.invalidateCache();

    return this.findOne(article.id);
  }

  async update(id: number, data: {
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
  }, userId: number, userRole: Role) {
    const existingArticle = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (!existingArticle) {
      throw new NotFoundException('文章不存在');
    }

    if (userRole !== Role.ADMIN && existingArticle.authorId !== userId) {
      throw new ForbiddenException('您没有权限编辑此文章');
    }

    if (data.status === ArticleStatus.PUBLISHED && userRole !== Role.ADMIN) {
      throw new ForbiddenException('只有管理员可以发布文章');
    }

    const lastVersion = await this.prisma.articleVersion.findFirst({
      where: { articleId: id },
      orderBy: { versionNumber: 'desc' },
    });

    const newVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    const updatedArticle = await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.update({
        where: { id },
        data: {
          title: data.title,
          summary: data.summary,
          coverImage: data.coverImage,
          content: data.content,
          categoryId: data.categoryId !== undefined ? data.categoryId : undefined,
          customSlug: data.customSlug,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          metaKeywords: data.metaKeywords,
          status: data.status,
          publishedAt: data.status === ArticleStatus.PUBLISHED 
            ? (existingArticle.publishedAt || new Date())
            : existingArticle.publishedAt,
        },
      });

      if (data.tagIds !== undefined) {
        await tx.articleTag.deleteMany({ where: { articleId: id } });
        
        if (data.tagIds.length > 0) {
          await tx.articleTag.createMany({
            data: data.tagIds.map(tagId => ({
              articleId: id,
              tagId,
            })),
            skipDuplicates: true,
          });
        }
      }

      await tx.articleVersion.create({
        data: {
          articleId: id,
          versionNumber: newVersionNumber,
          title: data.title || existingArticle.title,
          summary: data.summary !== undefined ? data.summary : existingArticle.summary,
          content: data.content !== undefined ? data.content : existingArticle.content,
          coverImage: data.coverImage !== undefined ? data.coverImage : existingArticle.coverImage,
          categoryId: data.categoryId !== undefined ? data.categoryId : existingArticle.categoryId,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          metaKeywords: data.metaKeywords,
          tagIds: data.tagIds || existingArticle.tags.map(t => t.tagId),
          createdById: userId,
          changeMessage: data.changeMessage || `版本 ${newVersionNumber} 更新`,
        },
      });

      return article;
    });

    await this.updateSearchVector(updatedArticle.id);
    await this.invalidateCache(updatedArticle.id);

    return this.findOne(updatedArticle.id);
  }

  async submitForReview(id: number, userId: number) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (article.status !== ArticleStatus.DRAFT) {
      throw new BadRequestException('只有草稿可以提交审核');
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: { status: ArticleStatus.PENDING_REVIEW },
    });

    await this.invalidateCache(id);
    return this.findOne(updated.id);
  }

  async approve(id: number, userId: number) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (article.status !== ArticleStatus.PENDING_REVIEW) {
      throw new BadRequestException('只有待审核的文章可以发布');
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: { 
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await this.invalidateCache(id);
    return this.findOne(updated.id);
  }

  async reject(id: number, reason: string, userId: number) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (article.status !== ArticleStatus.PENDING_REVIEW) {
      throw new BadRequestException('只有待审核的文章可以驳回');
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: { 
        status: ArticleStatus.DRAFT,
        rejectionReason: reason,
      },
    });

    return this.findOne(updated.id);
  }

  async archive(id: number, userId: number, userRole: Role) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (userRole !== Role.ADMIN && article.authorId !== userId) {
      throw new ForbiddenException('您没有权限操作此文章');
    }

    if (article.status !== ArticleStatus.PUBLISHED) {
      throw new BadRequestException('只有已发布的文章可以下架');
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: { status: ArticleStatus.ARCHIVED },
    });

    await this.invalidateCache(id);
    return this.findOne(updated.id);
  }

  async rollbackToVersion(id: number, versionNumber: number, userId: number, userRole: Role) {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (userRole !== Role.ADMIN && article.authorId !== userId) {
      throw new ForbiddenException('您没有权限操作此文章');
    }

    const version = await this.prisma.articleVersion.findUnique({
      where: { articleId_versionNumber: { articleId: id, versionNumber } },
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    const lastVersion = await this.prisma.articleVersion.findFirst({
      where: { articleId: id },
      orderBy: { versionNumber: 'desc' },
    });

    const newVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    const updatedArticle = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({
        where: { id },
        data: {
          title: version.title,
          summary: version.summary,
          content: version.content,
          coverImage: version.coverImage,
          categoryId: version.categoryId,
          metaTitle: version.metaTitle,
          metaDescription: version.metaDescription,
          metaKeywords: version.metaKeywords,
        },
      });

      await tx.articleTag.deleteMany({ where: { articleId: id } });
      
      if (version.tagIds.length > 0) {
        await tx.articleTag.createMany({
          data: version.tagIds.map(tagId => ({
            articleId: id,
            tagId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.articleVersion.create({
        data: {
          articleId: id,
          versionNumber: newVersionNumber,
          title: version.title,
          summary: version.summary,
          content: version.content,
          coverImage: version.coverImage,
          categoryId: version.categoryId,
          metaTitle: version.metaTitle,
          metaDescription: version.metaDescription,
          metaKeywords: version.metaKeywords,
          tagIds: version.tagIds,
          createdById: userId,
          changeMessage: `回滚到版本 ${versionNumber}`,
        },
      });

      return updated;
    });

    await this.updateSearchVector(updatedArticle.id);
    await this.invalidateCache(updatedArticle.id);

    return this.findOne(updatedArticle.id);
  }

  async getVersion(id: number, versionNumber: number) {
    const version = await this.prisma.articleVersion.findUnique({
      where: { articleId_versionNumber: { articleId: id, versionNumber } },
      include: {
        createdBy: { select: { id: true, username: true } },
      },
    });

    if (!version) {
      throw new NotFoundException('版本不存在');
    }

    return version;
  }

  async getVersions(id: number) {
    return this.prisma.articleVersion.findMany({
      where: { articleId: id },
      orderBy: { versionNumber: 'desc' },
      include: {
        createdBy: { select: { id: true, username: true } },
      },
    });
  }

  async getRelatedArticles(articleId: number, limit: number = 5) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { tags: true },
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    const tagIds = article.tags.map(t => t.tagId);

    let relatedArticles: any[] = [];

    if (tagIds.length > 0) {
      const articleTags = await this.prisma.articleTag.findMany({
        where: {
          tagId: { in: tagIds },
          articleId: { not: articleId },
        },
        select: { articleId: true },
        distinct: ['articleId'],
      });

      const relatedArticleIds = articleTags.map(at => at.articleId);

      if (relatedArticleIds.length > 0) {
        relatedArticles = await this.prisma.article.findMany({
          where: {
            id: { in: relatedArticleIds },
            status: ArticleStatus.PUBLISHED,
          },
          include: {
            category: true,
            tags: { include: { tag: true } },
          },
          take: limit,
          orderBy: { publishedAt: 'desc' },
        });
      }
    }

    if (relatedArticles.length < limit && article.categoryId) {
      const additionalArticles = await this.prisma.article.findMany({
        where: {
          categoryId: article.categoryId,
          status: ArticleStatus.PUBLISHED,
          id: { not: articleId, notIn: relatedArticles.map(a => a.id) },
        },
        include: {
          category: true,
          tags: { include: { tag: true } },
        },
        take: limit - relatedArticles.length,
        orderBy: { publishedAt: 'desc' },
      });

      relatedArticles = [...relatedArticles, ...additionalArticles];
    }

    return relatedArticles.map(a => ({
      ...a,
      tags: a.tags.map((t: any) => t.tag),
    }));
  }
}
