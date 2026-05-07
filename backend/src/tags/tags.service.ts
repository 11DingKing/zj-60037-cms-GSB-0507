import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    return tag;
  }

  async create(data: { name: string; color?: string }) {
    const existing = await this.prisma.tag.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException('标签名称已存在');
    }

    return this.prisma.tag.create({
      data: {
        name: data.name,
        color: data.color || '#3b82f6',
      },
    });
  }

  async update(id: number, data: { name?: string; color?: string }) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    if (data.name && data.name !== tag.name) {
      const existing = await this.prisma.tag.findUnique({
        where: { name: data.name },
      });
      if (existing) {
        throw new ConflictException('标签名称已存在');
      }
    }

    return this.prisma.tag.update({
      where: { id },
      data: {
        name: data.name,
        color: data.color,
      },
    });
  }

  async remove(id: number) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } },
    });

    if (!tag) {
      throw new NotFoundException('标签不存在');
    }

    if (tag._count.articles > 0) {
      throw new ConflictException('该标签下还有文章，请先移除关联');
    }

    await this.prisma.tag.delete({ where: { id } });

    return { message: '删除成功' };
  }

  async getPopularTags(limit: number = 20) {
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
  }
}
