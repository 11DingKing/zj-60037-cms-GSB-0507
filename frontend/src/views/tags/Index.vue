<template>
  <AdminLayout>
    <div class="tags-container">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>标签管理</span>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增标签
            </el-button>
          </div>
        </template>

        <el-table :data="tags" border>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="标签名称" min-width="200">
            <template #default="{ row }">
              <el-tag :color="row.color" style="font-size: 14px; padding: 6px 16px">
                {{ row.name }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="颜色" width="120">
            <template #default="{ row }">
              <div class="color-preview" :style="{ backgroundColor: row.color }"></div>
              <span class="color-code">{{ row.color }}</span>
            </template>
          </el-table-column>
          <el-table-column label="文章数" width="100">
            <template #default="{ row }">
              {{ row._count?.articles || 0 }}
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button type="danger" link @click="handleDelete(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-dialog
        v-model="dialogVisible"
        :title="isEdit ? '编辑标签' : '新增标签'"
        width="400px"
      >
        <el-form
          ref="tagFormRef"
          :model="tagForm"
          :rules="tagRules"
          label-width="80px"
        >
          <el-form-item label="标签名称" prop="name">
            <el-input v-model="tagForm.name" placeholder="请输入标签名称" />
          </el-form-item>
          <el-form-item label="颜色" prop="color">
            <div class="color-picker-wrapper">
              <el-color-picker v-model="tagForm.color" :predefine="predefineColors" />
              <span class="color-preview-text" :style="{ color: tagForm.color }">
                {{ tagForm.color }}
              </span>
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            确定
          </el-button>
        </template>
      </el-dialog>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import AdminLayout from '@/components/AdminLayout.vue'
import { request } from '@/utils/request'

const tags = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const tagFormRef = ref<FormInstance>()

const predefineColors = [
  '#ff4500',
  '#ff8c00',
  '#ffd700',
  '#90ee90',
  '#00ced1',
  '#1e90ff',
  '#c71585',
  '#6b7280',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]

const tagForm = reactive({
  id: null as number | null,
  name: '',
  color: '#3b82f6',
})

const tagRules: FormRules = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }],
  color: [{ required: true, message: '请选择颜色', trigger: 'change' }],
}

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchTags = async () => {
  try {
    const response = await request.get('/tags')
    tags.value = response.data
  } catch (error) {
    console.error('Failed to fetch tags:', error)
  }
}

const handleAdd = () => {
  isEdit.value = false
  tagForm.id = null
  tagForm.name = ''
  tagForm.color = '#3b82f6'
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  tagForm.id = row.id
  tagForm.name = row.name
  tagForm.color = row.color
  dialogVisible.value = true
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该标签吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await request.delete(`/tags/${row.id}`)
    ElMessage.success('删除成功')
    fetchTags()
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '删除失败'
      ElMessage.error(message)
    }
  }
}

const handleSubmit = async () => {
  if (!tagFormRef.value) return

  await tagFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value && tagForm.id) {
          await request.put(`/tags/${tagForm.id}`, {
            name: tagForm.name,
            color: tagForm.color,
          })
          ElMessage.success('更新成功')
        } else {
          await request.post('/tags', {
            name: tagForm.name,
            color: tagForm.color,
          })
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        fetchTags()
      } catch (error: any) {
        const message = error.response?.data?.message || '操作失败'
        ElMessage.error(message)
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  fetchTags()
})
</script>

<style scoped>
.tags-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: inline-block;
  vertical-align: middle;
  border: 1px solid #dcdfe6;
}

.color-code {
  margin-left: 8px;
  font-size: 13px;
  color: #909399;
  vertical-align: middle;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
}

.color-preview-text {
  margin-left: 12px;
  font-size: 14px;
}
</style>
