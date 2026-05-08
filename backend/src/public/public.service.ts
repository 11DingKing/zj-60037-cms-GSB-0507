import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ArticleStatus } from '@prisma/client';

@Injectable()
export class PublicService {
  private readonly CACHE_PREFIX = 'public:';
  private readonly CACHE_TTL = 1800;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  private async getOrSetCache(key: string, fn: () => Promise<any>) {
    const cached = await this.redisService.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await fn();
    await this.redisService.set(key, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  async getPublishedArticles(params: {
    page?: number;
    limit?: number;
    categoryId?: number;
    tagId?: number;
  }) {
    const { page = 1, limit = 10, categoryId, tagId } = params;
    const skip = (page - 1) * limit;

    const cacheKey = `${this.CACHE_PREFIX}articles:page=${page}:limit=${limit}:category=${categoryId || 'all'}:tag=${tagId || 'all'}`;

    return this.getOrSetCache(cacheKey, async () => {
      const where: any = { status: ArticleStatus.PUBLISHED };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      let articles;
      let total;

      if (tagId) {
        const articleTags = await this.prisma.articleTag.findMany({
          where: { tagId },
          select: { articleId: true },
        });
        const articleIds = articleTags.map(at => at.articleId);
        where.id = { in: articleIds };
      }

      [articles, total] = await this.prisma.$transaction([
        this.prisma.article.findMany({
          where,
          include: {
            category: true,
            author: { select: { id: true, username: true } },
            tags: { include: { tag: true } },
          },
          skip,
          take: limit,
          orderBy: { publishedAt: 'desc' },
        }),
        this.prisma.article.count({ where }),
      ]);

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
    });
  }

  async getPublishedArticleById(id: number) {
    return this.getOrSetCache(`${this.CACHE_PREFIX}article:${id}`, async () => {
      const article = await this.prisma.article.findUnique({
        where: { id, status: ArticleStatus.PUBLISHED },
        include: {
          category: true,
          author: { select: { id: true, username: true } },
          tags: { include: { tag: true } },
        },
      });

      if (!article) {
        return null;
      }

      return {
        ...article,
        tags: article.tags.map(at => at.tag),
      };
    });
  }

  async getRelatedArticles(articleId: number, limit: number = 5) {
    return this.getOrSetCache(`${this.CACHE_PREFIX}related:${articleId}:limit=${limit}`, async () => {
      const article = await this.prisma.article.findUnique({
        where: { id: articleId },
        include: { tags: true },
      });

      if (!article) {
        return [];
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
    });
  }

  async getCategoriesTree() {
    return this.getOrSetCache(`${this.CACHE_PREFIX}categories:tree`, async () => {
      const categories = await this.prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
      });

      const buildTree = (categories: any[], parentId: number | null = null): any[] => {
        return categories
          .filter(cat => cat.parentId === parentId)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(category => ({
            ...category,
            children: buildTree(categories, category.id),
          }));
      };

      return buildTree(categories);
    });
  }

  async getPopularTags(limit: number = 20) {
    return this.getOrSetCache(`${this.CACHE_PREFIX}tags:popular:limit=${limit}`, async () => {
      const tags = await this.prisma.tag.findMany({
        include: {
          _count: {
            select: { articles: true },
          },
        },
        orderBy: {
          articles: {
            _count: 'desc',
          },
        },
        take: limit,
      });

      return tags.map(tag => ({
        ...tag,
        articleCount: tag._count.articles,
      }));
    });
  }
}
