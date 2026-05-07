<template>
  <div class="preview-layout">
    <header class="header">
      <div class="header-content">
        <div class="logo" @click="$router.push('/preview')">
          <h1>CMS 内容平台</h1>
        </div>
        <nav class="nav">
          <router-link to="/preview" class="nav-item" active-class="active">
            首页
          </router-link>
          <template v-for="cat in topCategories" :key="cat.id">
            <router-link
              :to="`/preview/category/${cat.id}`"
              class="nav-item"
              active-class="active"
            >
              {{ cat.name }}
            </router-link>
          </template>
        </nav>
        <div class="header-actions">
          <router-link to="/login" class="login-btn">
            <el-button type="primary" size="small">
              <el-icon><User /></el-icon>
              管理后台
            </el-button>
          </router-link>
        </div>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>

    <footer class="footer">
      <div class="footer-content">
        <p>&copy; 2024 CMS 内容管理平台. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { request } from '@/utils/request'

const topCategories = ref<any[]>([])

const fetchCategories = async () => {
  try {
    const response = await request.get('/public/categories/tree')
    topCategories.value = response.data.slice(0, 5)
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.preview-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}

.logo h1 {
  color: white;
  font-size: 20px;
  margin: 0;
  cursor: pointer;
}

.nav {
  display: flex;
  gap: 30px;
}

.nav-item {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.nav-item:hover,
.nav-item.active {
  color: white;
}

.header-actions {
  display: flex;
  align-items: center;
}

.login-btn {
  text-decoration: none;
}

.main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
  width: 100%;
}

.footer {
  background-color: #303133;
  color: #909399;
  padding: 20px 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  text-align: center;
}

.footer-content p {
  margin: 0;
  font-size: 14px;
}
</style>
