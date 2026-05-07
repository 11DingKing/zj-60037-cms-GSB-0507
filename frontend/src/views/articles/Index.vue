<template>
  <AdminLayout>
    <div class="articles-container">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>文章管理</span>
            <el-button type="primary" @click="$router.push('/articles/create')">
              <el-icon><Plus /></el-icon>
              新建文章
            </el-button>
          </div>
        </template>

        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.search"
              placeholder="搜索标题或内容"
              clearable
              @keyup.enter="handleSearch"
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-tree-select
              v-model="searchForm.categoryId"
              :data="categoryTree"
              :props="{ label: 'name', value: 'id', children: 'children' }"
              check-strictly
              clearable
              placeholder="全部分类"
              style="width: 180px"
            />
          </el-form-item>
          <el-form-item label="标签">
            <el-select
              v-model="searchForm.tagId"
              clearable
              placeholder="全部标签"
              style="width: 150px"
            >
              <el-option
                v-for="tag in tags"
                :key="tag.id"
                :label="tag.name"
                :value="tag.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="searchForm.status"
              clearable
              placeholder="全部状态"
              style="width: 120px"
            >
              <el-option label="草稿" value="DRAFT" />
              <el-option label="待审核" value="PENDING_REVIEW" />
              <el-option label="已发布" value="PUBLISHED" />
              <el-option label="已下架" value="ARCHIVED" />
            </el-select>
          </el-form-item>
          <el-form-item label="日期范围">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>

        <el-table :data="articles" border v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="title" label="标题" min-width="250" show-overflow-tooltip />
          <el-table-column label="分类" width="120">
            <template #default="{ row }">
              {{ row.category?.name || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="标签" min-width="150">
            <template #default="{ row }">
              <el-tag
                v-for="tag in row.tags"
                :key="tag.id"
                :color="tag.color"
                size="small"
                style="margin-right: 4px"
              >
                {{ tag.name }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="作者" width="100">
            <template #default="{ row }">
              {{ row.author?.username || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="版本数" width="80">
            <template #default="{ row }">
              {{ row._count?.versions || 0 }}
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button
                v-if="row.status === 'DRAFT'"
                type="warning"
                link
                @click="handleSubmit(row)"
              >
                提交审核
              </el-button>
              <el-button
                v-if="row.status === 'PENDING_REVIEW' && isAdmin"
                type="success"
                link
                @click="handleApprove(row)"
              >
                通过
              </el-button>
              <el-button
                v-if="row.status === 'PENDING_REVIEW' && isAdmin"
                type="danger"
                link
                @click="handleReject(row)"
              >
                驳回
              </el-button>
              <el-button
                v-if="row.status === 'PUBLISHED'"
                type="info"
                link
                @click="handleArchive(row)"
              >
                下架
              </el-button>
              <el-button type="primary" link @click="handleViewVersions(row)">
                版本
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="searchForm.page"
          v-model:page-size="searchForm.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchArticles"
          @current-change="fetchArticles"
          style="margin-top: 20px; justify-content: flex-end"
        />
      </el-card>

      <el-dialog
        v-model="versionsDialogVisible"
        title="历史版本"
        width="800px"
      >
        <el-table :data="versions" border>
          <el-table-column prop="versionNumber" label="版本号" width="80" />
          <el-table-column prop="title" label="标题" min-width="200" />
          <el-table-column prop="changeMessage" label="变更说明" min-width="200" />
          <el-table-column prop="createdBy" label="创建者" width="100">
            <template #default="{ row }">
              {{ row.createdBy?.username }}
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleViewVersion(row)">
                查看
              </el-button>
              <el-button type="warning" link @click="handleRollback(row)">
                回滚
              </el-button>
              <el-button
                v-if="selectedVersion && selectedVersion.versionNumber !== row.versionNumber"
                type="info"
                link
                @click="handleCompare(row)"
              >
                对比
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-dialog>

      <el-dialog
        v-model="compareDialogVisible"
        title="版本对比"
        width="90%"
      >
        <div class="compare-container">
          <div class="compare-side">
            <h4>版本 {{ version1?.versionNumber }} (左侧)</h4>
            <div class="compare-content" v-html="diffHtml"></div>
          </div>
        </div>
      </el-dialog>

      <el-dialog
        v-model="rejectDialogVisible"
        title="驳回原因"
        width="400px"
      >
        <el-form>
          <el-form-item label="驳回原因">
            <el-input
              v-model="rejectReason"
              type="textarea"
              :rows="4"
              placeholder="请输入驳回原因"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="rejectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmReject" :loading="submitting">
            确定驳回
          </el-button>
        </template>
      </el-dialog>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as DiffMatchPatch from 'diff-match-patch'
import AdminLayout from '@/components/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { request } from '@/utils/request'

const router = useRouter()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const articles = ref<any[]>([])
const categoryTree = ref<any[]>([])
const tags = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const submitting = ref(false)

const searchForm = reactive({
  page: 1,
  limit: 10,
  search: '',
  categoryId: null as number | null,
  tagId: null as number | null,
  status: null as string | null,
  dateRange: null as string[] | null,
})

const versionsDialogVisible = ref(false)
const compareDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const currentArticleId = ref<number | null>(null)
const versions = ref<any[]>([])
const selectedVersion = ref<any>(null)
const version1 = ref<any>(null)
const version2 = ref<any>(null)
const diffHtml = ref('')
const rejectReason = ref('')

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: 'warning',
    PENDING_REVIEW: 'info',
    PUBLISHED: 'success',
    ARCHIVED: 'info',
  }
  return map[status] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    PENDING_REVIEW: '待审核',
    PUBLISHED: '已发布',
    ARCHIVED: '已下架',
  }
  return map[status] || status
}

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchArticles = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: searchForm.page,
      limit: searchForm.limit,
    }

    if (searchForm.search) {
      params.search = searchForm.search
    }
    if (searchForm.categoryId) {
      params.categoryId = searchForm.categoryId
    }
    if (searchForm.tagId) {
      params.tagId = searchForm.tagId
    }
    if (searchForm.status) {
      params.status = searchForm.status
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const response = await request.get('/articles', { params })
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
    const response = await request.get('/categories/tree')
    categoryTree.value = response.data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

const fetchTags = async () => {
  try {
    const response = await request.get('/tags')
    tags.value = response.data
  } catch (error) {
    console.error('Failed to fetch tags:', error)
  }
}

const handleSearch = () => {
  searchForm.page = 1
  fetchArticles()
}

const handleReset = () => {
  searchForm.page = 1
  searchForm.limit = 10
  searchForm.search = ''
  searchForm.categoryId = null
  searchForm.tagId = null
  searchForm.status = null
  searchForm.dateRange = null
  fetchArticles()
}

const handleEdit = (row: any) => {
  router.push(`/articles/${row.id}/edit`)
}

const handleSubmit = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要提交审核吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await request.put(`/articles/${row.id}/submit`)
    ElMessage.success('提交成功')
    fetchArticles()
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '操作失败'
      ElMessage.error(message)
    }
  }
}

const handleApprove = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要通过审核并发布吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success',
    })

    await request.put(`/articles/${row.id}/approve`)
    ElMessage.success('发布成功')
    fetchArticles()
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '操作失败'
      ElMessage.error(message)
    }
  }
}

const handleReject = (row: any) => {
  currentArticleId.value = row.id
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  submitting.value = true
  try {
    await request.put(`/articles/${currentArticleId.value}/reject`, {
      reason: rejectReason.value,
    })
    ElMessage.success('驳回成功')
    rejectDialogVisible.value = false
    fetchArticles()
  } catch (error: any) {
    const message = error.response?.data?.message || '操作失败'
    ElMessage.error(message)
  } finally {
    submitting.value = false
  }
}

const handleArchive = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要下架该文章吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await request.put(`/articles/${row.id}/archive`)
    ElMessage.success('下架成功')
    fetchArticles()
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '操作失败'
      ElMessage.error(message)
    }
  }
}

const handleViewVersions = async (row: any) => {
  currentArticleId.value = row.id
  selectedVersion.value = null
  try {
    const response = await request.get(`/articles/${row.id}/versions`)
    versions.value = response.data
    versionsDialogVisible.value = true
  } catch (error) {
    console.error('Failed to fetch versions:', error)
  }
}

const handleViewVersion = (row: any) => {
  selectedVersion.value = row
}

const handleRollback = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要回滚到版本 ${row.versionNumber} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await request.put(`/articles/${currentArticleId.value}/rollback/${row.versionNumber}`)
    ElMessage.success('回滚成功')
    versionsDialogVisible.value = false
    fetchArticles()
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '操作失败'
      ElMessage.error(message)
    }
  }
}

const handleCompare = (row: any) => {
  if (!selectedVersion.value) {
    selectedVersion.value = row
    ElMessage.info(`已选择版本 ${row.versionNumber}，请选择另一个版本进行对比`)
    return
  }

  version1.value = selectedVersion.value
  version2.value = row

  const dmp = new DiffMatchPatch.diff_match_patch()
  const diffs = dmp.diff_main(version1.value.content || '', version2.value.content || '')
  dmp.diff_cleanupSemantic(diffs)

  let html = ''
  for (const diff of diffs) {
    const [operation, text] = diff
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    if (operation === 1) {
      html += `<span class="diff-added">+ ${escapedText}</span>`
    } else if (operation === -1) {
      html += `<span class="diff-removed">- ${escapedText}</span>`
    } else {
      html += `<span class="diff-unchanged">${escapedText}</span>`
    }
  }

  diffHtml.value = html
  compareDialogVisible.value = true
}

onMounted(() => {
  fetchArticles()
  fetchCategories()
  fetchTags()
})
</script>

<style scoped>
.articles-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}

.compare-container {
  display: flex;
  gap: 20px;
}

.compare-side {
  flex: 1;
}

.compare-side h4 {
  margin-bottom: 10px;
  color: #606266;
}

.compare-content {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-family: monospace;
  line-height: 1.6;
  white-space: pre-wrap;
}
</style>
