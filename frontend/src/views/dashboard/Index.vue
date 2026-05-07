<template>
  <AdminLayout>
    <div class="dashboard-container">
      <el-row :gutter="20" class="stats-row">
        <el-col :xs="12" :sm="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background-color: #409eff">
                <el-icon><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.total }}</div>
                <div class="stat-label">文章总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background-color: #e6a23c">
                <el-icon><Edit /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.byStatus?.draft || 0 }}</div>
                <div class="stat-label">草稿</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background-color: #67c23a">
                <el-icon><View /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.byStatus?.published || 0 }}</div>
                <div class="stat-label">已发布</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background-color: #909399">
                <el-icon><Box /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.byStatus?.archived || 0 }}</div>
                <div class="stat-label">已下架</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :xs="24" :lg="14">
          <el-card class="chart-card">
            <template #header>
              <span>近30天发布趋势</span>
            </template>
            <div ref="trendChartRef" class="chart"></div>
          </el-card>
        </el-col>
        <el-col :xs="24" :lg="10">
          <el-card class="chart-card">
            <template #header>
              <span>各分类文章数</span>
            </template>
            <div ref="categoryChartRef" class="chart"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :span="24">
          <el-card class="chart-card">
            <template #header>
              <span>热门标签词云</span>
            </template>
            <div class="tags-cloud">
              <template v-for="tag in popularTags" :key="tag.id">
                <span
                  class="tag-item"
                  :style="{
                    fontSize: getTagFontSize(tag.articleCount) + 'px',
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    borderColor: tag.color,
                  }"
                >
                  {{ tag.name }} ({{ tag.articleCount }})
                </span>
              </template>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import AdminLayout from '@/components/AdminLayout.vue'
import { request } from '@/utils/request'

const statistics = ref({
  total: 0,
  byStatus: {
    draft: 0,
    pendingReview: 0,
    published: 0,
    archived: 0,
  },
})

const publishTrend = ref<any[]>([])
const categoryStats = ref<any[]>([])
const popularTags = ref<any[]>([])

const trendChartRef = ref<HTMLElement>()
const categoryChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let categoryChart: echarts.ECharts | null = null

const fetchData = async () => {
  try {
    const [statsRes, trendRes, categoryRes, tagsRes] = await Promise.all([
      request.get('/dashboard/statistics'),
      request.get('/dashboard/publish-trend?days=30'),
      request.get('/dashboard/category-stats'),
      request.get('/dashboard/popular-tags?limit=20'),
    ])

    statistics.value = statsRes.data
    publishTrend.value = trendRes.data
    categoryStats.value = categoryRes.data
    popularTags.value = tagsRes.data

    initTrendChart()
    initCategoryChart()
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  }
}

const initTrendChart = () => {
  if (!trendChartRef.value) return

  trendChart = echarts.init(trendChartRef.value)

  const dates = []
  const counts = []
  const today = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    dates.push(dateStr)

    const trendItem = publishTrend.value.find((item: any) => item.date === dateStr)
    counts.push(trendItem ? trendItem.count : 0)
  }

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        formatter: (value: string) => {
          return value.substring(5)
        },
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
    },
    series: [
      {
        name: '发布文章数',
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3,
        },
        data: counts,
        itemStyle: {
          color: '#409eff',
        },
      },
    ],
  }

  trendChart.setOption(option)
}

const initCategoryChart = () => {
  if (!categoryChartRef.value) return

  categoryChart = echarts.init(categoryChartRef.value)

  const categoryNames = categoryStats.value.map((item: any) => item.name)
  const categoryCounts = categoryStats.value.map((item: any) => item.articleCount)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categoryNames,
      axisLabel: {
        rotate: 30,
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
    },
    series: [
      {
        name: '文章数',
        type: 'bar',
        data: categoryCounts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409eff' },
            { offset: 1, color: '#67c23a' },
          ]),
        },
      },
    ],
  }

  categoryChart.setOption(option)
}

const getTagFontSize = (count: number) => {
  const maxCount = Math.max(...popularTags.value.map((t: any) => t.articleCount), 1)
  const minSize = 14
  const maxSize = 28
  return minSize + (count / maxCount) * (maxSize - minSize)
}

const handleResize = () => {
  trendChart?.resize()
  categoryChart?.resize()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  trendChart?.dispose()
  categoryChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-icon .el-icon {
  font-size: 28px;
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart {
  height: 350px;
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 150px;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.tag-item {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid;
  cursor: default;
  transition: all 0.3s;
  margin: 4px;
}

.tag-item:hover {
  transform: scale(1.05);
}
</style>
