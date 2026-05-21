<template>
  <div class="org-filter">
    <el-select
      v-model="selectedCompanyId"
      :placeholder="companyPlaceholder"
      :clearable="clearable"
      :multiple="companyMultiple"
      collapse-tags
      collapse-tags-tooltip
      filterable
      @change="handleCompanyChange"
      class="filter-select"
    >
      <el-option
        v-for="company in companies"
        :key="company.id"
        :label="company.name"
        :value="company.id"
      />
    </el-select>

    <el-select
      v-model="selectedDeptId"
      :placeholder="deptPlaceholder"
      :clearable="clearable"
      :multiple="deptMultiple"
      collapse-tags
      collapse-tags-tooltip
      filterable
      :disabled="deptDisabled"
      @change="handleDeptChange"
      class="filter-select"
    >
      <el-option
        v-for="dept in filteredDepartments"
        :key="dept.id"
        :label="dept.name"
        :value="dept.id"
      />
    </el-select>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import request from '@/utils/request'

const props = defineProps({
  companyId: {
    type: [Number, Array],
    default: null
  },
  deptId: {
    type: [Number, Array],
    default: null
  },
  companyPlaceholder: {
    type: String,
    default: '选择公司'
  },
  deptPlaceholder: {
    type: String,
    default: '选择部门'
  },
  clearable: {
    type: Boolean,
    default: true
  },
  companyMultiple: {
    type: Boolean,
    default: false
  },
  deptMultiple: {
    type: Boolean,
    default: false
  },
  deptDisabled: {
    type: Boolean,
    default: false
  },
  filterByCompany: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:companyId', 'update:deptId', 'change'])

const companies = ref([])
const departments = ref([])
const selectedCompanyId = ref(props.companyId)
const selectedDeptId = ref(props.deptId)

watch(() => props.companyId, (val) => {
  selectedCompanyId.value = val
  if (props.filterByCompany && val) {
    selectedDeptId.value = null
  }
})

watch(() => props.deptId, (val) => {
  selectedDeptId.value = val
})

const filteredDepartments = computed(() => {
  if (!props.filterByCompany || !selectedCompanyId.value) {
    return departments.value
  }

  const companyId = props.companyMultiple 
    ? selectedCompanyId.value 
    : [selectedCompanyId.value]

  if (props.companyMultiple) {
    return departments.value.filter(dept => 
      companyId.includes(dept.company_id)
    )
  } else {
    return departments.value.filter(dept => 
      dept.company_id === selectedCompanyId.value
    )
  }
})

const handleCompanyChange = (val) => {
  emit('update:companyId', val)
  
  if (props.filterByCompany) {
    selectedDeptId.value = null
    emit('update:deptId', null)
  }
  
  emit('change', { companyId: val, deptId: selectedDeptId.value })
}

const handleDeptChange = (val) => {
  emit('update:deptId', val)
  emit('change', { companyId: selectedCompanyId.value, deptId: val })
}

const loadCompanies = async () => {
  try {
    const res = await request.get('/companies')
    if (res.success) {
      companies.value = res.data || []
    }
  } catch (error) {
    console.error('加载公司列表失败:', error)
  }
}

const loadDepartments = async () => {
  try {
    const res = await request.get('/departments')
    if (res.success) {
      departments.value = res.data || []
    }
  } catch (error) {
    console.error('加载部门列表失败:', error)
  }
}

const loadData = async () => {
  await Promise.all([
    loadCompanies(),
    loadDepartments()
  ])
}

onMounted(() => {
  loadData()
})

defineExpose({
  refresh: loadData,
  clear: () => {
    selectedCompanyId.value = null
    selectedDeptId.value = null
    emit('update:companyId', null)
    emit('update:deptId', null)
  }
})
</script>

<style scoped>
.org-filter {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-select {
  min-width: 180px;
}

@media (max-width: 768px) {
  .org-filter {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-select {
    width: 100%;
  }
}
</style>
