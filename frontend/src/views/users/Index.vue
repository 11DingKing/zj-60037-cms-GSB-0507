<template>
  <AdminLayout>
    <div class="users-container">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>用户管理</span>
            <el-button type="primary" @click="handleAdd" v-if="isAdmin">
              <el-icon><Plus /></el-icon>
              新增用户
            </el-button>
          </div>
        </template>

        <el-table :data="users" border v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="username" label="用户名" width="150" />
          <el-table-column prop="email" label="邮箱" width="200" />
          <el-table-column label="角色" width="120">
            <template #default="{ row }">
              <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'primary'" size="small">
                {{ row.role === 'ADMIN' ? '管理员' : '编辑' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleEdit(row)" v-if="isAdmin">
                编辑
              </el-button>
              <el-button
                :type="row.isActive ? 'warning' : 'success'"
                link
                @click="handleToggleStatus(row)"
                v-if="isAdmin && row.id !== currentUserId"
              >
                {{ row.isActive ? '禁用' : '启用' }}
              </el-button>
              <el-button
                type="danger"
                link
                @click="handleDelete(row)"
                v-if="isAdmin && row.id !== currentUserId"
              >
                删除
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
          @size-change="fetchUsers"
          @current-change="fetchUsers"
          style="margin-top: 20px; justify-content: flex-end"
        />
      </el-card>

      <el-dialog
        v-model="dialogVisible"
        :title="isCreating ? '新增用户' : '编辑用户'"
        width="500px"
      >
        <el-form
          ref="userFormRef"
          :model="userForm"
          :rules="userRules"
          label-width="100px"
        >
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="userForm.username"
              placeholder="请输入用户名"
              :disabled="!isCreating"
            />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input
              v-model="userForm.email"
              placeholder="请输入邮箱"
            />
          </el-form-item>
          <el-form-item label="密码" prop="password" v-if="isCreating">
            <el-input
              v-model="userForm.password"
              type="password"
              placeholder="请输入密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="角色" prop="role">
            <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
              <el-option label="管理员" value="ADMIN" />
              <el-option label="编辑" value="EDITOR" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态" prop="isActive" v-if="!isCreating">
            <el-switch
              v-model="userForm.isActive"
              active-text="启用"
              inactive-text="禁用"
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
import { useAuthStore } from '@/stores/auth'
import { request } from '@/utils/request'

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)
const currentUserId = computed(() => authStore.user?.id)

const users = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const submitting = ref(false)
const dialogVisible = ref(false)
const isCreating = ref(true)
const userFormRef = ref<FormInstance>()

const searchForm = reactive({
  page: 1,
  limit: 10,
})

const userForm = reactive({
  username: '',
  email: '',
  password: '',
  role: 'EDITOR' as 'ADMIN' | 'EDITOR',
  isActive: true,
})

const userRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await request.get('/users', {
      params: {
        page: searchForm.page,
        limit: searchForm.limit,
      },
    })
    users.value = response.data.data
    total.value = response.data.total
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  userForm.username = ''
  userForm.email = ''
  userForm.password = ''
  userForm.role = 'EDITOR'
  userForm.isActive = true
}

const handleAdd = () => {
  isCreating.value = true
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isCreating.value = false
  userForm.username = row.username
  userForm.email = row.email
  userForm.role = row.role
  userForm.isActive = row.isActive
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!userFormRef.value) return

  await userFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isCreating.value) {
          await request.post('/users', {
            username: userForm.username,
            email: userForm.email,
            password: userForm.password,
            role: userForm.role,
          })
          ElMessage.success('创建成功')
        } else {
          await request.put(`/users/${users.value.find(u => u.username === userForm.username)?.id}`, {
            email: userForm.email,
            role: userForm.role,
            isActive: userForm.isActive,
          })
          ElMessage.success('更新成功')
        }
        dialogVisible.value = false
        fetchUsers()
      } catch (error: any) {
        const message = error.response?.data?.message || '操作失败'
        ElMessage.error(message)
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleToggleStatus = async (row: any) => {
  const action = row.isActive ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}该用户吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await request.put(`/users/${row.id}`, {
      isActive: !row.isActive,
    })
    ElMessage.success(`${action}成功`)
    fetchUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '操作失败'
      ElMessage.error(message)
    }
  }
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该用户吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await request.delete(`/users/${row.id}`)
    ElMessage.success('删除成功')
    fetchUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      const message = error.response?.data?.message || '操作失败'
      ElMessage.error(message)
    }
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.users-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
