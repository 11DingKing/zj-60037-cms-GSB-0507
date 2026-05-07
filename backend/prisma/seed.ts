import { PrismaClient, Role, ArticleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建种子数据...');

  // 清空现有数据
  await prisma.articleVersion.deleteMany();
  await prisma.articleTag.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('创建用户...');
  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@cms.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const editor = await prisma.user.create({
    data: {
      username: 'editor',
      email: 'editor@cms.com',
      password: hashedPassword,
      role: Role.EDITOR,
    },
  });

  console.log('创建分类树（3级共10个分类）...');
  
  // 一级分类（3个）
  const tech = await prisma.category.create({
    data: { name: '技术', slug: 'technology', sortOrder: 1 },
  });

  const life = await prisma.category.create({
    data: { name: '生活', slug: 'life', sortOrder: 2 },
  });

  const culture = await prisma.category.create({
    data: { name: '文化', slug: 'culture', sortOrder: 3 },
  });

  // 二级分类（4个）
  const frontend = await prisma.category.create({
    data: { name: '前端开发', slug: 'frontend', sortOrder: 1, parentId: tech.id },
  });

  const backend = await prisma.category.create({
    data: { name: '后端开发', slug: 'backend', sortOrder: 2, parentId: tech.id },
  });

  const travel = await prisma.category.create({
    data: { name: '旅行', slug: 'travel', sortOrder: 1, parentId: life.id },
  });

  const food = await prisma.category.create({
    data: { name: '美食', slug: 'food', sortOrder: 2, parentId: life.id },
  });

  // 三级分类（3个）
  const react = await prisma.category.create({
    data: { name: 'React', slug: 'react', sortOrder: 1, parentId: frontend.id },
  });

  const vue = await prisma.category.create({
    data: { name: 'Vue', slug: 'vue', sortOrder: 2, parentId: frontend.id },
  });

  const nodejs = await prisma.category.create({
    data: { name: 'Node.js', slug: 'nodejs', sortOrder: 1, parentId: backend.id },
  });

  const categories = [tech, life, culture, frontend, backend, travel, food, react, vue, nodejs];

  console.log('创建标签（15个）...');
  const tagNames = [
    { name: 'JavaScript', color: '#f7df1e' },
    { name: 'TypeScript', color: '#3178c6' },
    { name: 'Vue', color: '#42b883' },
    { name: 'React', color: '#61dafb' },
    { name: 'Node.js', color: '#339933' },
    { name: 'CSS', color: '#1572b6' },
    { name: 'HTML', color: '#e34f26' },
    { name: 'Python', color: '#3776ab' },
    { name: '数据库', color: '#4479a1' },
    { name: '设计', color: '#ff6b6b' },
    { name: '旅行', color: '#20b2aa' },
    { name: '美食', color: '#ff6347' },
    { name: '读书', color: '#8b4513' },
    { name: '电影', color: '#e91e63' },
    { name: '音乐', color: '#9c27b0' },
  ];

  const tags = [];
  for (const tagData of tagNames) {
    const tag = await prisma.tag.create({
      data: tagData,
    });
    tags.push(tag);
  }

  console.log('创建文章（20篇，每篇2-3个历史版本）...');
  
  const articleTemplates = [
    { title: 'Vue 3 Composition API 深度解析', categoryId: vue.id, status: ArticleStatus.PUBLISHED },
    { title: 'React Hooks 最佳实践指南', categoryId: react.id, status: ArticleStatus.PUBLISHED },
    { title: 'Node.js 性能优化技巧', categoryId: nodejs.id, status: ArticleStatus.PUBLISHED },
    { title: 'TypeScript 类型体操入门', categoryId: frontend.id, status: ArticleStatus.PUBLISHED },
    { title: 'CSS Grid 布局完全指南', categoryId: frontend.id, status: ArticleStatus.PUBLISHED },
    { title: 'PostgreSQL 索引优化详解', categoryId: backend.id, status: ArticleStatus.PENDING_REVIEW },
    { title: 'Redis 缓存最佳实践', categoryId: backend.id, status: ArticleStatus.PENDING_REVIEW },
    { title: '日本东京旅行攻略', categoryId: travel.id, status: ArticleStatus.PUBLISHED },
    { title: '成都美食探店指南', categoryId: food.id, status: ArticleStatus.PUBLISHED },
    { title: 'React 18 新特性详解', categoryId: react.id, status: ArticleStatus.DRAFT },
    { title: 'Vue 3.4 响应式系统升级', categoryId: vue.id, status: ArticleStatus.DRAFT },
    { title: 'Express.js 中间件原理', categoryId: nodejs.id, status: ArticleStatus.ARCHIVED },
    { title: 'Webpack 5 配置优化', categoryId: frontend.id, status: ArticleStatus.ARCHIVED },
    { title: '泰国自由行攻略', categoryId: travel.id, status: ArticleStatus.PUBLISHED },
    { title: '广州早茶文化', categoryId: food.id, status: ArticleStatus.PUBLISHED },
    { title: 'NestJS 模块化开发', categoryId: backend.id, status: ArticleStatus.PENDING_REVIEW },
    { title: 'GraphQL 入门教程', categoryId: backend.id, status: ArticleStatus.DRAFT },
    { title: 'Tailwind CSS 实用技巧', categoryId: frontend.id, status: ArticleStatus.PUBLISHED },
    { title: 'Next.js 14 App Router', categoryId: react.id, status: ArticleStatus.PUBLISHED },
    { title: 'Nuxt 3 服务端渲染', categoryId: vue.id, status: ArticleStatus.PUBLISHED },
  ];

  for (let i = 0; i < articleTemplates.length; i++) {
    const template = articleTemplates[i];
    const author = i % 2 === 0 ? editor : editor; // 都用编辑创建
    
    const article = await prisma.article.create({
      data: {
        title: template.title,
        summary: `这是关于${template.title}的文章摘要，详细介绍了相关技术要点和实践经验。`,
        coverImage: `https://picsum.photos/800/400?random=${i}`,
        content: `<p>这是文章的正文内容，详细介绍了${template.title}的相关知识。</p><h2>第一章：概述</h2><p>在本章中，我们将介绍基本概念和背景知识。</p><h2>第二章：实践</h2><p>通过实际案例来学习如何应用这些技术。</p><pre><code>const example = 'code snippet';
console.log(example);</code></pre><p>更多内容正在更新中...</p>`,
        categoryId: template.categoryId,
        authorId: author.id,
        status: template.status,
        metaTitle: `${template.title} - CMS平台`,
        metaDescription: `深入了解${template.title}的技术细节和最佳实践。`,
        metaKeywords: `${template.title},教程,指南`,
        publishedAt: template.status === ArticleStatus.PUBLISHED ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
      },
    });

    // 为文章添加标签（随机选2-4个）
    const tagCount = 2 + Math.floor(Math.random() * 3);
    const shuffledTags = [...tags].sort(() => Math.random() - 0.5);
    const selectedTags = shuffledTags.slice(0, tagCount);

    for (const tag of selectedTags) {
      await prisma.articleTag.create({
        data: {
          articleId: article.id,
          tagId: tag.id,
        },
      });
    }

    // 创建历史版本（2-3个版本）
    const versionCount = 2 + Math.floor(Math.random() * 2);
    for (let v = 1; v <= versionCount; v++) {
      const isLatest = v === versionCount;
      const versionContent = isLatest 
        ? article.content 
        : `<p>这是版本 ${v} 的内容。</p><h2>第一章：概述</h2><p>旧版本的内容描述。</p>`;
      
      await prisma.articleVersion.create({
        data: {
          articleId: article.id,
          versionNumber: v,
          title: isLatest ? article.title : `${article.title} (版本${v})`,
          summary: isLatest ? article.summary : `这是版本${v}的摘要。`,
          content: versionContent,
          coverImage: article.coverImage,
          categoryId: article.categoryId,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          metaKeywords: article.metaKeywords,
          tagIds: selectedTags.map(t => t.id),
          createdById: author.id,
          changeMessage: v === 1 ? '初始版本' : `第${v}次更新：优化内容结构`,
        },
      });
    }

    // 更新搜索向量
    await prisma.$executeRaw`
      UPDATE articles 
      SET search_vector = to_tsvector('simple', ${article.title} || ' ' || COALESCE(${article.content}, ''))
      WHERE id = ${article.id}
    `;
  }

  console.log('种子数据创建完成！');
  console.log('');
  console.log('默认账户：');
  console.log('  管理员：admin / 123456');
  console.log('  编辑：editor / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
