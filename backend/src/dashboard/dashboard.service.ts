import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStatistics() {
    const [total, draft, pending, published, archived] = await Promise.all([
      this.prisma.article.count(),
      this.prisma.article.count({ where: { status: ArticleStatus.DRAFT } }),
      this.prisma.article.count({ where: { status: ArticleStatus.PENDING_REVIEW } }),
      this.prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } }),
      this.prisma.article.count({ where: { status: ArticleStatus.ARCHIVED } }),
    ]);

    return {
      total,
      byStatus: {
        draft,
        pendingReview: pending,
        published,
        archived,
      },
    };
  }

  async getPublishTrend(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.$queryRaw`
      SELECT 
        DATE("publishedAt") as date,
        COUNT(*) as count
      FROM articles
      WHERE "publishedAt" >= ${startDate}
        AND "publishedAt" <= ${endDate}
        AND status = ${ArticleStatus.PUBLISHED}
      GROUP BY DATE("publishedAt")
      ORDER BY date ASC
    `;

    return result;
  }

  async getCategoryStats() {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: { articles: true },
        },
        children: {
          include: {
            _count: {
              select: { articles: true },
            },
          },
        },
      },
      where: {
        parentId: null,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      articleCount: cat._count.articles + cat.children.reduce((sum, child) => sum + child._count.articles, 0),
    }));
  }

  async getPopularTags(limit: number = 15) {
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
      id: tag.id,
      name: tag.name,
      color: tag.color,
      articleCount: tag._count.articles,
    }));
  }

  async getRecentArticlesOverview() {
    const [
      statistics, publishTrend, categoryStats, popularTags] = await Promise.all([
      this.getStatistics(),
      this.getPublishTrend(30),
      this.getCategoryStats(),
      this.getPopularTags(15),
    ]);

    return {
      statistics,
      publishTrend,
      categoryStats,
      popularTags,
    };
  }
}
