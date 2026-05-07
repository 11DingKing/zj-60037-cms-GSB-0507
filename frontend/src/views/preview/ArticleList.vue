<template>
  <div class="article-list-page">
    <div class="content-wrapper">
      <div class="main-content">
        <div class="section-header">
          <h2>全部文章</h2>
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
            </div>
          </div>
        </div>

        <el-empty v-if="!loading && !articles.length" :description="'暂无文章'" />

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

        <div class="sidebar-card">
          <h3 class="sidebar-title">分类导航</h3>
          <div class="category-tree">
            <template v-for="cat in categoryTree" :key="cat.id">
              <div class="category-item" @click="handleCategoryClick(cat)">
                <el-icon><Folder /></el-icon>
                <span>{{ cat.name }}</span>
                <span class="category-count">({{ cat._count?.articles || 0 }})</span>
              </div>
              <div class="category-children" v-if="cat.children?.length">
                <div
                  class="category-item child"
                  v-for="child in cat.children"
                  :key="child.id"
                  @click="handleCategoryClick(child)"
                >
                  <el-icon><FolderOpened /></el-icon>
                  <span>{{ child.name }}</span>
                  <span class="category-count">({{ child._count?.articles || 0 }})</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/utils/request'

const router = useRouter()

const articles = ref<any[]>([])
const categoryTree = ref<any[]>([])
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

const fetchArticles = async () => {
  loading.value = true
  try {
    const response = await request.get('/public/articles', {
      params: searchForm,
    })
    articles.value = response.data.data
    total.value = response.data.total
  } catch (error) {
    console.error('Failed to fetch articles:', error)
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const response = await request.get('/public/categories/tree')
    categoryTree.value = response.data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
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

const handleCategoryClick = (category: any) => {
  router.push(`/preview/category/${category.id}`)
}

onMounted(() => {
  fetchArticles()
  fetchCategories()
  fetchHotTags()
})
</script>

<style scoped>
.article-list-page {
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
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
  border-left: 4px solid #667eea;
  padding-left: 12px;
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
  width: 180px;
  height: 130px;
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

.category-item.child {
  padding-left: 28px;
  font-size: 13px;
}

.category-count {
  margin-left: auto;
  font-size: 12px;
  color: #c0c4cc;
}
</style>
