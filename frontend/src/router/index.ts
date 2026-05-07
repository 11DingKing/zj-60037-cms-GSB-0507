import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/dashboard/Index.vue'),
      meta: { requiresAuth: true, title: '首页看板' },
    },
    {
      path: '/categories',
      name: 'Categories',
      component: () => import('@/views/categories/Index.vue'),
      meta: { requiresAuth: true, title: '分类管理' },
    },
    {
      path: '/tags',
      name: 'Tags',
      component: () => import('@/views/tags/Index.vue'),
      meta: { requiresAuth: true, title: '标签管理' },
    },
    {
      path: '/articles',
      name: 'Articles',
      component: () => import('@/views/articles/Index.vue'),
      meta: { requiresAuth: true, title: '文章管理' },
    },
    {
      path: '/articles/create',
      name: 'ArticleCreate',
      component: () => import('@/views/articles/Edit.vue'),
      meta: { requiresAuth: true, title: '创建文章' },
    },
    {
      path: '/articles/:id/edit',
      name: 'ArticleEdit',
      component: () => import('@/views/articles/Edit.vue'),
      meta: { requiresAuth: true, title: '编辑文章' },
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('@/views/users/Index.vue'),
      meta: { requiresAuth: true, title: '用户管理', roles: ['ADMIN'] },
    },
    {
      path: '/preview',
      name: 'Preview',
      component: () => import('@/views/preview/Layout.vue'),
      meta: { public: true },
      children: [
        {
          path: '',
          name: 'PreviewHome',
          component: () => import('@/views/preview/Home.vue'),
          meta: { public: true, title: '首页' },
        },
        {
          path: 'articles',
          name: 'PreviewArticleList',
          component: () => import('@/views/preview/ArticleList.vue'),
          meta: { public: true, title: '文章列表' },
        },
        {
          path: 'articles/:id',
          name: 'PreviewArticleDetail',
          component: () => import('@/views/preview/ArticleDetail.vue'),
          meta: { public: true, title: '文章详情' },
        },
        {
          path: 'category/:id',
          name: 'PreviewCategory',
          component: () => import('@/views/preview/Category.vue'),
          meta: { public: true, title: '分类文章' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const token = localStorage.getItem('token')

  if (to.meta.public) {
    if (token && to.path === '/login') {
      next('/dashboard')
    } else {
      next()
    }
    return
  }

  if (to.meta.requiresAuth) {
    if (!token) {
      next('/login')
      return
    }

    if (!authStore.user) {
      try {
        await authStore.fetchProfile()
      } catch {
        localStorage.removeItem('token')
        next('/login')
        return
      }
    }

    if (to.meta.roles && to.meta.roles.length > 0) {
      if (!to.meta.roles.includes(authStore.user?.role)) {
        next('/dashboard')
        return
      }
    }
  }

  next()
})

export default router
