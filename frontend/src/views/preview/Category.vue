<template>
  <div class="category-page">
    <div class="content-wrapper">
      <div class="main-content">
        <div class="section-header">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>
              <router-link to="/preview">首页</router-link>
            </el-breadcrumb-item>
            <el-breadcrumb-item
              v-if="currentCategory?.parent"
            >
              <router-link :to="`/preview/category/${currentCategory.parent.id}`">
                {{ currentCategory.parent.name }}
              </router-link>
            </el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentCategory?.name }}</el-breadcrumb-item>
          </el-breadcrumb>
          <h2>{{ currentCategory?.name }}</h2>
          <p class="category-desc">共 {{ total }} 篇文章</p>
        </div>

        <div class="article-list">
          <div
            v-for="article in articles"
            :key="article.id"
            class="article-card"
            @click="$router.push(`/preview/article/${article.id}`)"
          >
            <div class="article-cover" v-if="article.coverImage">
              <img :src="article.coverImage" :alt="article.title" />
            </div>
            <div class="article-info">
              <h3 class="article-title">{{ article.title }}</h3>
              <p class="article-summary">{{ article.summary }}</p>
              <div class="article-meta">
                <span class="meta-item">
                  <el-icon><User /></el-icon>
                  {{ article.author?.username }}
                </span>
                <span class="meta-item">
                  <el-icon><Clock /></el-icon>
                  {{ formatDate(article.publishedAt) }}
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
            </div>
          </div>
        </div>

        <el-empty v-if="!loading && !articles.length" :description="'该分类下暂无文章'" />

        <el-pagination
          v-model:current-page="searchForm.page"
          v-model:page-size="searchForm.limit"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="prev, pager, next"
          @current-change="fetchArticles"
          class="pagination"
        />
      </div>

      <aside class="sidebar">
        <div class="sidebar-card">
          <h3 class="sidebar-title">子分类</h3>
          <div class="category-tree" v-if="currentCategory?.children?.length">
            <div
              class="category-item"
              v-for="child in currentCategory.children"
              :key="child.id"
              @click="$router.push(`/preview/category/${child.id}`)"
            >
              <el-icon><FolderOpened /></el-icon>
              <span>{{ child.name }}</span>
              <span class="category-count">({{ child._count?.articles || 0 }})</span>
            </div>
          </div>
          <el-empty v-else :description="'无子分类'" :image-size="60" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { request } from '@/utils/request'

const route = useRoute()

const articles = ref<any[]>([])
const currentCategory = ref<any>(null)
const hotTags = ref<any[]>([])
const loading = ref(false)
const total = ref(0)

const searchForm = reactive({
  page: 1,
  limit: 10,
})

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const fetchCategory = async () => {
  const id = route.params.id
  if (!id) return

  try {
    const response = await request.get('/public/categories/tree')
    const findCategory = (categories: any[], targetId: number): any => {
      for (const cat of categories) {
        if (cat.id === targetId) return cat
        if (cat.children?.length) {
          const found = findCategory(cat.children, targetId)
          if (found) return found
        }
      }
      return null
    }
    currentCategory.value = findCategory(response.data, Number(id))
  } catch (error) {
    console.error('Failed to fetch category:', error)
  }
}

const fetchArticles = async () => {
  const id = route.params.id
  if (!id) return

  loading.value = true
  try {
    const response = await request.get('/public/articles', {
      params: {
        ...searchForm,
        categoryId: id,
      },
    })
    articles.value = response.data.data
    total.value = response.data.total
  } catch (error) {
    console.error('Failed to fetch articles:', error)
  } finally {
    loading.value = false
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
  fetchCategory()
  fetchArticles()
  fetchHotTags()
})
</script>

<style scoped>
.category-page {
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

.section-header {
  margin-bottom: 30px;
}

.section-header h2 {
  margin: 16px 0 8px 0;
  font-size: 24px;
  color: #303133;
  font-weight: 600;
}

.category-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.article-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  display: flex;
  gap: 20px;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.article-cover {
  flex-shrink: 0;
  width: 160px;
  height: 120px;
  border-radius: 6px;
  overflow: hidden;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.article-title {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: #303133;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-summary {
  margin: 0 0 12px 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.article-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pagination {
  justify-content: center;
  margin-top: 30px;
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

.category-tree {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #606266;
  font-size: 14px;
}

.category-item:hover {
  background-color: #f5f7fa;
  color: #667eea;
}

.category-count {
  margin-left: auto;
  font-size: 12px;
  color: #c0c4cc;
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
