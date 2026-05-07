<template>
  <AdminLayout>
    <div class="article-edit-container">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>{{ isEdit ? '编辑文章' : '新建文章' }}</span>
            <div class="header-actions">
              <el-button type="primary" @click="handleSave" :loading="saving">
                <el-icon><Save /></el-icon>
                保存草稿
              </el-button>
              <el-button type="warning" @click="handleSubmit" :loading="submitting">
                <el-icon><Upload /></el-icon>
                提交审核
              </el-button>
              <el-button v-if="isAdmin && articleForm.status === 'PENDING_REVIEW'" type="success" @click="handleApprove" :loading="approving">
                <el-icon><Check /></el-icon>
                审核通过
              </el-button>
              <el-button v-if="isAdmin && articleForm.status === 'PUBLISHED'" type="info" @click="handleArchive" :loading="archiving">
                <el-icon><Box /></el-icon>
                下架
              </el-button>
            </div>
          </div>
        </template>

        <el-form
          ref="articleFormRef"
          :model="articleForm"
          :rules="articleRules"
          label-width="100px"
        >
          <el-form-item label="文章标题" prop="title">
            <el-input
              v-model="articleForm.title"
              placeholder="请输入文章标题"
              size="large"
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="分类" prop="categoryId">
                <el-tree-select
                  v-model="articleForm.categoryId"
                  :data="categoryTree"
                  :props="{ label: 'name', value: 'id', children: 'children' }"
                  check-strictly
                  clearable
                  placeholder="请选择分类"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="标签">
                <el-select
                  v-model="articleForm.tagIds"
                  multiple
                  filterable
                  placeholder="请选择标签"
                  style="width: 100%"
                >
                  <el-option
                    v-for="tag in tags"
                    :key="tag.id"
                    :label="tag.name"
                    :value="tag.id"
                  >
                    <span style="color: {{ tag.color }}">{{ tag.name }}</span>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="封面图">
            <el-input
              v-model="articleForm.coverImage"
              placeholder="请输入封面图URL"
            />
            <div v-if="articleForm.coverImage" class="cover-preview">
              <img :src="articleForm.coverImage" alt="封面预览" />
            </div>
          </el-form-item>

          <el-form-item label="文章摘要">
            <el-input
              v-model="articleForm.summary"
              type="textarea"
              :rows="3"
              placeholder="请输入文章摘要"
            />
          </el-form-item>

          <el-form-item label="正文内容">
            <div class="editor-wrapper">
              <div class="editor-toolbar">
                <el-button-group>
                  <el-button
                    :type="editor?.isActive('bold') ? 'primary' : 'default'"
                    @click="editor?.chain().focus().toggleBold().run()"
                    size="small"
                  >
                    <el-icon><Bold /></el-icon>
                  </el-button>
                  <el-button
                    :type="editor?.isActive('italic') ? 'primary' : 'default'"
                    @click="editor?.chain().focus().toggleItalic().run()"
                    size="small"
                  >
                    <el-icon><Italic /></el-icon>
                  </el-button>
                  <el-button
                    :type="editor?.isActive('strike') ? 'primary' : 'default'"
                    @click="editor?.chain().focus().toggleStrike().run()"
                    size="small"
                  >
                    <el-icon><Remove /></el-icon>
                  </el-button>
                </el-button-group>
                <el-button-group>
                  <el-button
                    :type="editor?.isActive('heading', { level: 1 }) ? 'primary' : 'default'"
                    @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
                    size="small"
                  >
                    H1
                  </el-button>
                  <el-button
                    :type="editor?.isActive('heading', { level: 2 }) ? 'primary' : 'default'"
                    @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
                    size="small"
                  >
                    H2
                  </el-button>
                  <el-button
                    :type="editor?.isActive('heading', { level: 3 }) ? 'primary' : 'default'"
                    @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
                    size="small"
                  >
                    H3
                  </el-button>
                </el-button-group>
                <el-button-group>
                  <el-button
                    :type="editor?.isActive('bulletList') ? 'primary' : 'default'"
                    @click="editor?.chain().focus().toggleBulletList().run()"
                    size="small"
                  >
                    <el-icon><List /></el-icon>
                  </el-button>
                  <el-button
                    :type="editor?.isActive('orderedList') ? 'primary' : 'default'"
                    @click="editor?.chain().focus().toggleOrderedList().run()"
                    size="small"
                  >
                    <el-icon><Sort /></el-icon>
                  </el-button>
                  <el-button
                    :type="editor?.isActive('codeBlock') ? 'primary' : 'default'"
                    @click="editor?.chain().focus().toggleCodeBlock().run()"
                    size="small"
                  >
                    <el-icon><Document /></el-icon>
                  </el-button>
                </el-button-group>
                <el-button
                  :type="editor?.isActive('link') ? 'primary' : 'default'"
                  @click="toggleLink"
                  size="small"
                >
                  <el-icon><Link /></el-icon>
                </el-button>
                <el-button @click="undo" size="small">
                  <el-icon><ArrowLeft /></el-icon>
                </el-button>
                <el-button @click="redo" size="small">
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
              <div class="editor-container">
                <EditorContent :editor="editor" class="tiptap" />
              </div>
            </div>
          </el-form-item>

          <el-divider>SEO 配置</el-divider>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="自定义 Slug">
                <el-input
                  v-model="articleForm.customSlug"
                  placeholder="留空则自动生成"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Meta Title">
                <el-input
                  v-model="articleForm.metaTitle"
                  placeholder="SEO 标题"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="Meta Description">
            <el-input
              v-model="articleForm.metaDescription"
              type="textarea"
              :rows="2"
              placeholder="SEO 描述"
            />
          </el-form-item>

          <el-form-item label="Meta Keywords">
            <el-input
              v-model="articleForm.metaKeywords"
              placeholder="SEO 关键词，用逗号分隔"
            />
          </el-form-item>
        </el-form>

        <el-divider v-if="article.id">版本管理</el-divider>
        <div v-if="article.id" class="version-section">
          <el-button type="primary" link @click="showVersionsDialog = true">
            <el-icon><Clock /></el-icon>
            查看历史版本
          </el-button>
        </div>
      </el-card>

      <el-dialog
        v-model="showVersionsDialog"
        title="历史版本"
        width="700px"
      >
        <el-table :data="versions" border>
          <el-table-column prop="versionNumber" label="版本" width="80" />
          <el-table-column prop="title" label="标题" min-width="200" />
          <el-table-column prop="changeMessage" label="变更说明" min-width="150" />
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button
                type="warning"
                link
                @click="handleRollback(row)"
              >
                回滚
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-dialog>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import AdminLayout from '@/components/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { request } from '@/utils/request'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const articleFormRef = ref<FormInstance>()
const categoryTree = ref<any[]>([])
const tags = ref<any[]>([])
const versions = ref<any[]>([])
const showVersionsDialog = ref(false)

const saving = ref(false)
const submitting = ref(false)
const approving = ref(false)
const archiving = ref(false)

const articleId = computed(() => route.params.id ? Number(route.params.id) : null)
const isEdit = computed(() => !!articleId.value)
const article = ref<any>(null)

const articleForm = reactive({
  title: '',
  summary: '',
  coverImage: '',
  categoryId: null as number | null,
  tagIds: [] as number[],
  customSlug: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  status: 'DRAFT' as string,
})

const articleRules: FormRules = {
  title: [{ required: true, message: '请输入文章标题', trigger: 'blur' }],
}

const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    Link.configure({
      openOnClick: false,
    }),
    Image.configure({
      inline: true,
    }),
    Placeholder.configure({
      placeholder: '请输入文章内容...',
    }),
  ],
  content: '',
  onUpdate: ({ editor }) => {
    // 内容更新时触发
  },
})

const toggleLink = () => {
  if (!editor.value) return
  const previousUrl = editor.value.getAttributes('link').href
  const url = window.prompt('输入链接URL:', previousUrl)
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const undo = () => {
  editor.value?.chain().focus().undo().run()
}

const redo = () => {
  editor.value?.chain().focus().redo().run()
}

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
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

const fetchArticle = async (id: number) => {
  try {
    const response = await request.get(`/articles/${id}`)
    article.value = response.data
    
    articleForm.title = response.data.title || ''
    articleForm.summary = response.data.summary || ''
    articleForm.coverImage = response.data.coverImage || ''
    articleForm.categoryId = response.data.categoryId
    articleForm.tagIds = response.data.tags?.map((t: any) => t.id) || []
    articleForm.customSlug = response.data.customSlug || ''
    articleForm.metaTitle = response.data.metaTitle || ''
    articleForm.metaDescription = response.data.metaDescription || ''
    articleForm.metaKeywords = response.data.metaKeywords || ''
    articleForm.status = response.data.status

    if (response.data.content && editor.value) {
      editor.value.commands.setContent(response.data.content)
    }
  } catch (error) {
    console.error('Failed to fetch article:', error)
  }
}

const fetchVersions = async () => {
  if (!articleId.value) return
  try {
    const response = await request.get(`/articles/${articleId.value}/versions`)
    versions.value = response.data
  } catch (error) {
    console.error('Failed to fetch versions:', error)
  }
}

const handleSave = async () => {
  if (!articleFormRef.value) return

  await articleFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        const data = {
          ...articleForm,
          content: editor.value?.getHTML() || '',
          status: 'DRAFT' as const,
        }

        if (isEdit.value && articleId.value) {
          await request.put(`/articles/${articleId.value}`, data)
          ElMessage.success('保存成功')
        } else {
          const response = await request.post('/articles', data)
          ElMessage.success('创建成功')
          router.push(`/articles/${response.data.id}/edit`)
        }
      } catch (error: any) {
        const message = error.response?.data?.message || '保存失败'
        ElMessage.error(message)
      } finally {
        saving.value = false
      }
    }
  })
}

const handleSubmit = async () => {
  try {
    await ElMessageBox.confirm('确定要提交审核吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    submitting.value = true
    await handleSave()
    if (articleId.value) {
      await request.put(`/articles/${articleId.value}/submit`)
      ElMessage.success('提交成功')
      if (articleId.value) {
        fetchArticle(articleId.value)
      }
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '提交失败'
      ElMessage.error(message)
    }
  } finally {
    submitting.value = false
  }
}

const handleApprove = async () => {
  if (!articleId.value) return

  try {
    await ElMessageBox.confirm('确定要审核通过并发布吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success',
    })

    approving.value = true
    await request.put(`/articles/${articleId.value}/approve`)
    ElMessage.success('发布成功')
    fetchArticle(articleId.value)
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '操作失败'
      ElMessage.error(message)
    }
  } finally {
    approving.value = false
  }
}

const handleArchive = async () => {
  if (!articleId.value) return

  try {
    await ElMessageBox.confirm('确定要下架该文章吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    archiving.value = true
    await request.put(`/articles/${articleId.value}/archive`)
    ElMessage.success('下架成功')
    fetchArticle(articleId.value)
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '操作失败'
      ElMessage.error(message)
    }
  } finally {
    archiving.value = false
  }
}

const handleRollback = async (row: any) => {
  if (!articleId.value) return

  try {
    await ElMessageBox.confirm(`确定要回滚到版本 ${row.versionNumber} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await request.put(`/articles/${articleId.value}/rollback/${row.versionNumber}`)
    ElMessage.success('回滚成功')
    showVersionsDialog.value = false
    fetchArticle(articleId.value)
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '操作失败'
      ElMessage.error(message)
    }
  }
}

watch(showVersionsDialog, (val) => {
  if (val) {
    fetchVersions()
  }
})

onMounted(() => {
  fetchCategories()
  fetchTags()
  if (articleId.value) {
    fetchArticle(articleId.value)
  }
})
</script>

<style scoped>
.article-edit-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.editor-wrapper {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.editor-toolbar {
  padding: 10px;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  background-color: #f5f7fa;
}

.editor-container {
  padding: 16px;
  min-height: 400px;
}

.cover-preview {
  margin-top: 10px;
}

.cover-preview img {
  max-width: 300px;
  max-height: 200px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.version-section {
  padding: 10px 0;
}
</style>
