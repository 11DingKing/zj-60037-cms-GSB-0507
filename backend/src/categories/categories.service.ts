import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Role } from '@prisma/client';

@Injectable()
export class CategoriesService {
  private readonly CACHE_KEY = 'categories:tree';
  private readonly CACHE_TTL = 3600;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  private buildTree(categories: any[], parentId: number | null = null): any[] {
    return categories
      .filter(cat => cat.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(category => ({
        ...category,
        children: this.buildTree(categories, category.id),
      }));
  }

  async findAllTree() {
    const cached = await this.redisService.get(this.CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const tree = this.buildTree(categories);
    await this.redisService.set(this.CACHE_KEY, JSON.stringify(tree), this.CACHE_TTL);

    return tree;
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        parent: true,
        _count: {
          select: { children: true, articles: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return category;
  }

  async create(data: {
    name: string;
    slug: string;
    sortOrder?: number;
    parentId?: number;
  }) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ConflictException('Slug 已存在');
    }

    if (data.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new NotFoundException('父分类不存在');
      }
    }

    const category = await this.prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        sortOrder: data.sortOrder || 0,
        parentId: data.parentId || null,
      },
    });

    await this.redisService.del(this.CACHE_KEY);
    return category;
  }

  async update(id: number, data: {
    name?: string;
    slug?: string;
    sortOrder?: number;
    parentId?: number;
  }) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    if (data.slug && data.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      });
      if (existing) {
        throw new ConflictException('Slug 已存在');
      }
    }

    if (data.parentId === id) {
      throw new ConflictException('不能将自己设为父分类');
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        sortOrder: data.sortOrder,
        parentId: data.parentId !== undefined ? data.parentId : undefined,
      },
    });

    await this.redisService.del(this.CACHE_KEY);
    return updated;
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true, articles: true } } },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    if (category._count.children > 0) {
      throw new ConflictException('请先删除子分类');
    }

    if (category._count.articles > 0) {
      throw new ConflictException('请先移除该分类下的文章');
    }

    await this.prisma.category.delete({ where: { id } });
    await this.redisService.del(this.CACHE_KEY);

    return { message: '删除成功' };
  }
}
