<template>
  <div class="article-detail">
    <div class="content-wrapper">
      <div class="main-content">
        <article class="article-content">
          <header class="article-header">
            <h1 class="article-title">{{ article.title }}</h1>
            <div class="article-meta">
              <span class="meta-item">
                <el-icon><User /></el-icon>
                {{ article.author?.username }}
              </span>
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatDate(article.publishedAt) }}
              </span>
              <span class="meta-item" v-if="article.category">
                <el-icon><Folder /></el-icon>
                {{ article.category.name }}
              </span>
            </div>
            <div class="article-tags" v-if="article.tags?.length">
              <el-tag
                v-for="tag in article.tags"
                :key="tag.id"
                :color="tag.color"
                size="small"
              >
                {{ tag.name }}
              </el-tag>
            </div>
          </header>

          <div class="article-summary" v-if="article.summary">
            <blockquote>
              <p>{{ article.summary }}</p>
            </blockquote>
          </div>

          <div
            class="article-body"
            v-html="article.content"
          ></div>
        </article>
      </div>

      <aside class="sidebar">
        <div class="sidebar-card">
          <h3 class="sidebar-title">相关文章</h3>
          <div class="related-articles">
            <div
              v-for="item in relatedArticles"
              :key="item.id"
              class="related-item"
              @click="$router.push(`/preview/article/${item.id}`)"
            >
              <h4 class="related-title">{{ item.title }}</h4>
              <p class="related-meta">
                {{ formatDate(item.publishedAt) }}
              </p>
            </div>
            <el-empty v-if="!relatedArticles.length" :description="'暂无相关文章'" />
          </div>
        </div>

        <div class="sidebar-card">
          <h3 class="sidebar-title">热门标签</h3>
          <div class="tag-cloud">
            <el-tag
              v-for="tag in hotTags"
              :key="tag.id"
              :color="tag.color"
              size="small"
              class="tag-item"
            >
              {{ tag.name }}
            </el-tag>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { request } from '@/utils/request'

const route = useRoute()

const article = ref<any>({})
const relatedArticles = ref<any[]>([])
const hotTags = ref<any[]>([])
const loading = ref(false)

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const fetchArticle = async () => {
  const id = route.params.id
  if (!id) return

  loading.value = true
  try {
    const response = await request.get(`/public/articles/${id}`)
    article.value = response.data
    fetchRelatedArticles()
  } catch (error) {
    console.error('Failed to fetch article:', error)
  } finally {
    loading.value = false
  }
}

const fetchRelatedArticles = async () => {
  const id = route.params.id
  if (!id) return

  try {
    const response = await request.get(`/public/articles/${id}/related`)
    relatedArticles.value = response.data
  } catch (error) {
    console.error('Failed to fetch related articles:', error)
  }
}

const fetchHotTags = async () => {
  try {
    const response = await request.get('/public/tags/hot')
    hotTags.value = response.data.slice(0, 10)
  } catch (error) {
    console.error('Failed to fetch tags:', error)
  }
}

onMounted(() => {
  fetchArticle()
  fetchHotTags()
})
</script>

<style scoped>
.article-detail {
  width: 100%;
}

.content-wrapper {
  display: flex;
  gap: 30px;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.article-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.article-header {
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 20px;
  margin-bottom: 20px;
}

.article-title {
  margin: 0 0 16px 0;
  font-size: 28px;
  color: #303133;
  font-weight: 600;
  line-height: 1.4;
}

.article-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.article-tags {
  display: flex;
  gap: 8px;
}

.article-summary {
  margin-bottom: 24px;
}

.article-summary blockquote {
  margin: 0;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-left: 4px solid #667eea;
  border-radius: 0 8px 8px 0;
}

.article-summary p {
  margin: 0;
  color: #606266;
  font-size: 15px;
  line-height: 1.8;
  font-style: italic;
}

.article-body {
  font-size: 16px;
  line-height: 2;
  color: #303133;
}

.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3),
.article-body :deep(h4),
.article-body :deep(h5),
.article-body :deep(h6) {
  margin: 24px 0 16px 0;
  color: #303133;
  font-weight: 600;
  line-height: 1.4;
}

.article-body :deep(h1) {
  font-size: 24px;
}

.article-body :deep(h2) {
  font-size: 22px;
  padding-bottom: 8px;
  border-bottom: 2px solid #667eea;
}

.article-body :deep(h3) {
  font-size: 20px;
}

.article-body :deep(p) {
  margin: 16px 0;
  text-align: justify;
}

.article-body :deep(strong) {
  font-weight: 600;
  color: #409eff;
}

.article-body :deep(em) {
  font-style: italic;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.article-body :deep(li) {
  margin: 8px 0;
  line-height: 1.8;
}

.article-body :deep(pre) {
  margin: 20px 0;
  padding: 16px 20px;
  background: #282c34;
  border-radius: 8px;
  overflow-x: auto;
}

.article-body :deep(code) {
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  color: #e06c75;
}

.article-body :deep(pre code) {
  color: #abb2bf;
  background: transparent;
  padding: 0;
}

.article-body :deep(a) {
  color: #409eff;
  text-decoration: none;
  transition: color 0.2s;
}

.article-body :deep(a:hover) {
  color: #66b1ff;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.article-body :deep(blockquote) {
  margin: 20px 0;
  padding: 12px 20px;
  background: #f5f7fa;
  border-left: 4px solid #667eea;
  border-radius: 0 8px 8px 0;
  color: #606266;
}

.article-body :deep(blockquote p) {
  margin: 0;
}

.sidebar {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.sidebar-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.related-articles {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.related-item {
  cursor: pointer;
  padding: 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.related-item:hover {
  background-color: #f5f7fa;
}

.related-title {
  margin: 0 0 6px 0;
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.related-meta {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  cursor: pointer;
  transition: transform 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}
</style>
