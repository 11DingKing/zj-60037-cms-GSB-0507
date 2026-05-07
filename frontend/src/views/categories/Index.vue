<template>
  <AdminLayout>
    <div class="categories-container">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>分类管理</span>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>
              新增分类
            </el-button>
          </div>
        </template>

        <el-table :data="categoryTree" row-key="id" :tree-props="{ children: 'children' }" border>
          <el-table-column prop="name" label="分类名称" min-width="200">
            <template #default="{ row }">
              <span class="category-name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="slug" label="Slug" min-width="150" />
          <el-table-column prop="sortOrder" label="排序权重" width="120" />
          <el-table-column label="父分类" width="150">
            <template #default="{ row }">
              {{ row.parent?.name || '-' }}
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
        :title="isEdit ? '编辑分类' : '新增分类'"
        width="500px"
      >
        <el-form
          ref="categoryFormRef"
          :model="categoryForm"
          :rules="categoryRules"
          label-width="100px"
        >
          <el-form-item label="分类名称" prop="name">
            <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
          </el-form-item>
          <el-form-item label="Slug" prop="slug">
            <el-input v-model="categoryForm.slug" placeholder="请输入Slug（URL友好）" />
          </el-form-item>
          <el-form-item label="排序权重" prop="sortOrder">
            <el-input-number v-model="categoryForm.sortOrder" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="父分类">
            <el-tree-select
              v-model="categoryForm.parentId"
              :data="categoryOptions"
              :props="{ label: 'name', value: 'id', children: 'children' }"
              check-strictly
              placeholder="请选择父分类（不选则为顶级分类）"
              clearable
              style="width: 100%"
            />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import AdminLayout from '@/components/AdminLayout.vue'
import { request } from '@/utils/request'

const categoryTree = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const categoryFormRef = ref<FormInstance>()

const categoryForm = reactive({
  id: null as number | null,
  name: '',
  slug: '',
  sortOrder: 0,
  parentId: null as number | null,
})

const categoryRules: FormRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  slug: [{ required: true, message: '请输入Slug', trigger: 'blur' }],
}

const categoryOptions = computed(() => {
  return categoryTree.value.map(item => ({
    ...item,
    children: item.children,
  }))
})

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchCategories = async () => {
  try {
    const response = await request.get('/categories')
    categoryTree.value = response.data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

const handleAdd = () => {
  isEdit.value = false
  categoryForm.id = null
  categoryForm.name = ''
  categoryForm.slug = ''
  categoryForm.sortOrder = 0
  categoryForm.parentId = null
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  categoryForm.id = row.id
  categoryForm.name = row.name
  categoryForm.slug = row.slug
  categoryForm.sortOrder = row.sortOrder
  categoryForm.parentId = row.parentId
  dialogVisible.value = true
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该分类吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await request.delete(`/categories/${row.id}`)
    ElMessage.success('删除成功')
    fetchCategories()
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '删除失败'
      ElMessage.error(message)
    }
  }
}

const handleSubmit = async () => {
  if (!categoryFormRef.value) return

  await categoryFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEdit.value && categoryForm.id) {
          await request.put(`/categories/${categoryForm.id}`, {
            name: categoryForm.name,
            slug: categoryForm.slug,
            sortOrder: categoryForm.sortOrder,
            parentId: categoryForm.parentId,
          })
          ElMessage.success('更新成功')
        } else {
          await request.post('/categories', {
            name: categoryForm.name,
            slug: categoryForm.slug,
            sortOrder: categoryForm.sortOrder,
            parentId: categoryForm.parentId,
          })
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        fetchCategories()
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
  fetchCategories()
})
</script>

<style scoped>
.categories-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-name {
  font-weight: 500;
}
</style>
