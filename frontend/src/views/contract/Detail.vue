<template>
  <div class="page-container">
    <div class="page-header">
      <el-page-header @back="$router.back()" :content="`合同详情 - ${detail.contract?.name || ''}`" />
      <el-button type="primary" @click="openEdit" :loading="saving">
        <el-icon><Edit /></el-icon> 编辑合同
      </el-button>
    </div>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 左：基本信息 -->
      <el-col :span="16">
        <el-card shadow="never">
          <template #header><span class="card-title">基本信息</span></template>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="合同编号">
              <div class="contract-no-cell">
                <span v-if="!editingContractNo">{{ detail.contract?.contract_no }}</span>
                <el-input 
                  v-else 
                  v-model="newContractNo" 
                  size="small" 
                  style="width: 150px"
                  @keyup.enter="saveContractNo"
                  @keyup.esc="cancelEditContractNo"
                />
                <el-button 
                  v-if="!editingContractNo && (!detail.orders || detail.orders.length === 0)" 
                  type="primary" 
                  text 
                  size="small" 
                  @click="startEditContractNo"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-tooltip 
                  v-if="!editingContractNo && detail.orders && detail.orders.length > 0"
                  content="该合同已关联订单，无法修改编号"
                  placement="top"
                >
                  <el-icon style="color: #999; margin-left: 8px"><WarningFilled /></el-icon>
                </el-tooltip>
                <template v-if="editingContractNo">
                  <el-button type="success" text size="small" @click="saveContractNo" :loading="savingContractNo">
                    <el-icon><Check /></el-icon>
                  </el-button>
                  <el-button type="danger" text size="small" @click="cancelEditContractNo">
                    <el-icon><Close /></el-icon>
                  </el-button>
                </template>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="签订日期">{{ detail.contract?.date }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusType(detail.contract?.status)" size="small">{{ detail.contract?.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="客户名称">{{ detail.contract?.customer_name }}</el-descriptions-item>
            <el-descriptions-item label="银行账户">{{ detail.contract?.bank_account_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="部门">{{ detail.contract?.dept_name }}</el-descriptions-item>
            <el-descriptions-item label="公司">{{ detail.contract?.company_name }}</el-descriptions-item>
            <el-descriptions-item label="负责人">{{ detail.contract?.manager }}</el-descriptions-item>
            <el-descriptions-item label="业务员">{{ detail.contract?.salesman }}</el-descriptions-item>
            <el-descriptions-item label="合同名称" :span="2">{{ detail.contract?.name }}</el-descriptions-item>
            <el-descriptions-item label="服务内容" :span="3">{{ detail.contract?.service_content }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 附件 -->
        <el-card shadow="never" style="margin-top:12px">
          <template #header>
            <div class="card-header">
              <span class="card-title">合同附件</span>
              <el-upload :action="uploadUrl" :headers="uploadHeaders" :on-success="handleDetailUpload"
                :on-error="() => ElMessage.error('上传失败')" :show-file-list="false" :multiple="true"
                accept=".pdf,.jpg,.png,.jpeg,.doc,.docx">
                <el-button type="primary" plain size="small"><el-icon><Upload /></el-icon> 上传附件</el-button>
              </el-upload>
            </div>
          </template>
          <div v-if="detailAttachments.length > 0" class="file-list">
            <div v-for="(url, idx) in detailAttachments" :key="idx" class="file-item">
              <el-icon class="file-icon"><Document /></el-icon>
              <el-link type="primary" :href="url" target="_blank" class="file-name">{{ getFileName(url) }}</el-link>
              <el-button size="small" type="danger" text circle @click="removeDetailAttachment(idx, url)">
                <el-icon><CloseBold /></el-icon>
              </el-button>
            </div>
          </div>
          <div v-else class="no-file">暂无附件</div>
        </el-card>
      </el-col>

      <!-- 右：金额信息 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span class="card-title">金额信息</span>
              <el-button size="small" type="success" plain @click="refreshAmount" :loading="refreshing">
                <el-icon><Refresh /></el-icon> 刷新统计
              </el-button>
            </div>
          </template>
          <div class="amount-grid">
            <div class="amount-item" v-for="item in amountItems" :key="item.label">
              <div class="amount-val" :style="{ color: item.color || '#1a1a1a' }">{{ fmtMoney(detail.contract?.[item.key]) }}</div>
              <div class="amount-label">{{ item.label }}</div>
            </div>
          </div>
        </el-card>


      </el-col>
    </el-row>

    <!-- 关联订单 -->
    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span class="card-title">关联订单（{{ pagination.total || 0 }} 个）</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <template v-if="selectedOrders.length > 0">
              <el-button type="success" size="small" @click="handleBatchRequest">
                <el-icon><Money /></el-icon> 批量请款 ({{ selectedOrders.length }})
              </el-button>
              <el-button type="primary" size="small" @click="showBatchStatusDialog = true">
                <el-icon><Switch /></el-icon> 批量改状态
              </el-button>
              <el-button type="danger" size="small" @click="handleBatchDelete">
                <el-icon><Delete /></el-icon> 批量删除
              </el-button>
              <el-button size="small" @click="selectedOrders = []">取消选择</el-button>
            </template>
            <template v-else>
              <el-button type="success" size="small" @click="openOrderDialog">
                <el-icon><Plus /></el-icon> 新增订单
              </el-button>
              <el-button type="primary" size="small" @click="handleExportOrders">
                <el-icon><Download /></el-icon> 导出订单
              </el-button>
            </template>
          </div>
        </div>
      </template>
      <el-table :data="detail.orders" stripe border size="small" @selection-change="handleOrderSelectionChange">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="order_no" label="订单编号" width="140">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/orders/${row.id}`)">{{ row.order_no }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="project_name" label="项目名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="business_category" label="业务类别" width="100" />
        <el-table-column prop="quantity" label="数量" width="70" align="right" />
        <el-table-column prop="total" label="合计" width="110" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total) }}</template>
        </el-table-column>
        <el-table-column prop="report_no" label="报告编号" width="120" show-overflow-tooltip />
        <el-table-column prop="report_date" label="报告日期" width="100" />
        <el-table-column prop="manager" label="负责人" width="80" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="{ '待处理':'info','进行中':'primary','已完成':'success','已取消':'danger' }[row.status]" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" text @click="handleRequestPayment(row)">
              <el-icon><Money /></el-icon>请款
            </el-button>
            <el-button size="small" type="primary" text @click="openOrderEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button size="small" type="danger" text @click="handleOrderDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @change="loadDetail"
        />
      </div>
    </el-card>

    <!-- 请款记录 -->
    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-header">
          <span class="card-title">请款记录（{{ paymentRequests.length }} 个）</span>
          <el-button 
            v-if="selectedPaymentRequests.length > 0" 
            type="danger" 
            size="small" 
            @click="handleBatchDeletePaymentRequests"
          >
            <el-icon><Delete /></el-icon> 批量删除 ({{ selectedPaymentRequests.length }})
          </el-button>
        </div>
      </template>
      <el-table 
        :data="paymentRequests" 
        stripe 
        border 
        size="small"
        @selection-change="handlePaymentRequestSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="request_no" label="请款单号" width="130" />
        <el-table-column prop="batch_no" label="请款批次" width="120" />
        <el-table-column prop="date" label="日期" width="100" />
        <el-table-column prop="request_amount" label="请款金额" width="110" align="right">
          <template #default="{ row }">{{ fmtMoney(row.request_amount) }}</template>
        </el-table-column>
        <el-table-column prop="received_amount" label="已收金额" width="110" align="right">
          <template #default="{ row }">{{ fmtMoney(row.received_amount) }}</template>
        </el-table-column>
        <el-table-column prop="request_status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="{ '草稿':'info','待审核':'warning','已请款':'primary','部分收款':'warning','已收款':'success' }[row.request_status]" size="small">
              {{ row.request_status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
      </el-table>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑合同" width="760px" destroy-on-close>
      <el-form :model="editForm" :rules="rules" ref="editFormRef" label-width="90px" size="default">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="合同名称" prop="name">
              <el-input v-model="editForm.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="签订日期">
              <el-date-picker v-model="editForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称">
              <el-select v-model="editForm.customer_id" filterable clearable placeholder="请选择客户" style="width:100%" @change="onCustomerChange">
                <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属公司">
              <el-select v-model="editForm.company_id" filterable clearable placeholder="请选择公司" style="width:100%" @change="onCompanyChange">
                <el-option v-for="c in companies" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="银行账户">
              <el-select v-model="editForm.bank_account_id" filterable clearable placeholder="请选择银行账户" style="width:100%">
                <el-option v-for="acc in companyBankAccounts" :key="acc.id" :label="`${acc.account_name} - ${acc.bank_account}`" :value="acc.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="editForm.status" style="width:100%">
                <el-option label="未签订" value="未签订" />
                <el-option label="执行中" value="执行中" />
                <el-option label="已完成" value="已完成" />
                <el-option label="已取消" value="已取消" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责人">
              <el-select v-model="editForm.manager" filterable clearable placeholder="请选择" style="width:100%">
                <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务员">
              <el-select v-model="editForm.salesman" filterable clearable placeholder="请选择" style="width:100%">
                <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="服务内容">
              <el-input v-model="editForm.service_content" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="合同金额">
              <el-input-number v-model="editForm.amount" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="应收款">
              <el-input-number v-model="editForm.receivable" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="已请款">
              <el-input-number v-model="editForm.requested" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="已收款">
              <el-input-number v-model="editForm.received" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结算金额">
              <el-input-number v-model="editForm.cost" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="税费">
              <el-input-number v-model="editForm.tax" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="劳务费">
              <el-input-number v-model="editForm.labor_cost" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="业务费">
              <el-input-number v-model="editForm.business_fee" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="其他费用">
              <el-input-number v-model="editForm.other" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="绩效">
              <el-input-number v-model="editForm.performance" :precision="2" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="利润">
              <el-input-number v-model="editForm.profit" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 请款确认弹窗 -->
    <el-dialog v-model="requestDialogVisible" title="订单请款确认" width="600px" destroy-on-close>
      <el-table :data="requestOrders" stripe border size="small" max-height="300">
        <el-table-column prop="order_no" label="订单编号" width="140" />
        <el-table-column prop="project_name" label="项目名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="total" label="订单金额" width="120" align="right">
          <template #default="{ row }">{{ fmtMoney(row.total) }}</template>
        </el-table-column>
      </el-table>
      <div style="margin-top:16px;padding:12px;background:#f5f7fa;border-radius:4px">
        <el-row>
          <el-col :span="12">
            <span>订单数量：<b>{{ requestOrders.length }}</b> 个</span>
          </el-col>
          <el-col :span="12">
            <span>请款总金额：<b style="color:#52c41a">{{ fmtMoney(requestOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)) }}</b></span>
          </el-col>
        </el-row>
      </div>
      <template #footer>
        <el-button @click="requestDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="requestLoading" @click="handleConfirmRequest">确认请款</el-button>
      </template>
    </el-dialog>

    <!-- 批量状态变更弹窗 -->
    <el-dialog v-model="showBatchStatusDialog" title="批量变更订单状态" width="500px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="目标状态">
          <el-select v-model="batchTargetStatus" placeholder="请选择" style="width:200px">
            <el-option label="待审核" value="待审核" />
            <el-option label="已审核" value="已审核" />
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="选中订单">
          <span>共 <b>{{ selectedOrders.length }}</b> 条订单</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchStatusDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchStatusChange">确认变更</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑订单弹窗 -->
    <el-dialog v-model="orderVisible" :title="editOrderId ? '编辑订单' : '新增订单'" width="900px" destroy-on-close>
      <el-form :model="orderForm" :rules="orderRules" ref="orderFormRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="日期" prop="date"><el-date-picker v-model="orderForm.date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="合同编号"><el-input v-model="orderForm.contract_no" disabled /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="订单状态">
            <el-select v-model="orderForm.status" style="width:100%">
              <el-option label="待处理" value="待处理" /><el-option label="进行中" value="进行中" />
              <el-option label="已完成" value="已完成" /><el-option label="已取消" value="已取消" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="工程名称"><el-input v-model="orderForm.project_name" placeholder="自动带出合同名称" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="客户名称"><el-input v-model="orderForm.customer_name" placeholder="自动带出客户" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="收款账户"><el-input v-model="orderForm.bank_account_name" disabled placeholder="自动带出合同账户" /></el-form-item></el-col>
        </el-row>

        <!-- 业务明细表格 -->
        <el-divider content-position="left">业务明细（可添加多项）</el-divider>
        <div class="items-header">
          <el-button type="primary" size="small" plain @click="addOrderItem"><el-icon><Plus /></el-icon>添加业务</el-button>
          <div class="items-summary">
            <span>合计：<b>{{ fmtMoney(orderForm.total) }}</b></span>
            <span>结算费：<b>{{ fmtMoney(orderForm.settlement_fee) }}</b></span>
            <span>绩效费：<b>{{ fmtMoney(orderForm.performance_fee) }}</b></span>
          </div>
        </div>
        <el-table :data="orderItems" border size="small" style="margin-bottom:16px">
          <el-table-column type="index" label="#" width="50" align="center" />
          <el-table-column label="业务类别" min-width="140">
            <template #default="{ row }">
              <el-select v-model="row.business_category" filterable placeholder="选择类别" size="small" style="width:100%" @change="onItemCategoryChange(row)">
                <el-option v-for="cat in businessCategories" :key="cat" :label="cat" :value="cat" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="业务项目" min-width="160">
            <template #default="{ row }">
              <el-select v-model="row.business_id" filterable placeholder="选择项目" size="small" style="width:100%" @change="onItemBusinessChange(row)">
                <el-option v-for="b in filteredBusiness(row.business_category)" :key="b.id" :label="b.project" :value="b.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="业务参数" width="120">
            <template #default="{ row }"><el-input v-model="row.parameter" size="small" placeholder="参数" /></template>
          </el-table-column>
          <el-table-column label="数量" width="100" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="0" :precision="2" size="small" controls-position="right" style="width:80px" @change="calcItemTotal(row)" />
            </template>
          </el-table-column>
          <el-table-column label="单价" width="100" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.unit_price" :min="0" :precision="4" size="small" controls-position="right" style="width:90px" @change="calcItemTotal(row)" />
            </template>
          </el-table-column>
          <el-table-column label="金额" width="100" align="right">
            <template #default="{ row }"><span class="money">{{ fmtMoney(row.total) }}</span></template>
          </el-table-column>
          <el-table-column label="结算费" width="90" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.settlement_fee" :min="0" :precision="2" size="small" controls-position="right" style="width:80px" @change="calcOrderSummary" />
            </template>
          </el-table-column>
          <el-table-column label="绩效费" width="90" align="center">
            <template #default="{ row }">
              <el-input-number v-model="row.performance_fee" :min="0" :precision="2" size="small" controls-position="right" style="width:80px" @change="calcOrderSummary" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60" align="center">
            <template #default="{ $index }">
              <el-button size="small" type="danger" text @click="removeOrderItem($index)"><el-icon><Delete /></el-icon></el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="负责人">
            <el-select v-model="orderForm.manager" filterable clearable placeholder="请选择" style="width:100%">
              <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="6"><el-form-item label="业务员">
            <el-select v-model="orderForm.salesman" filterable clearable placeholder="请选择" style="width:100%">
              <el-option v-for="e in employees" :key="e.id" :label="e.name" :value="e.name" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="6"><el-form-item label="报告日期"><el-date-picker v-model="orderForm.report_date" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="报告编号"><el-input v-model="orderForm.report_no" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="备注"><el-input v-model="orderForm.remark" type="textarea" :rows="2" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="orderVisible = false">取消</el-button>
        <el-button type="primary" :loading="orderSaving" @click="handleOrderSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/store/auth'
import { contractApi, orderApi, businessApi, employeeApi, companyApi, customerApi, bankAccountApi, paymentRequestApi, paymentRequestBatchApi } from '@/api'

const route = useRoute()
const detail = ref({ contract: null, orders: [], orderSummary: {} })
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const editVisible = ref(false)
const saving = ref(false)
const refreshing = ref(false)
const editFormRef = ref()
const editForm = ref({})
const auth = useAuthStore()

const editingContractNo = ref(false)
const newContractNo = ref('')
const savingContractNo = ref(false)

const paymentRequests = ref([])
const selectedPaymentRequests = ref([])
const loadingPaymentRequests = ref(false)

const selectedOrders = ref([])
const showBatchStatusDialog = ref(false)
const batchTargetStatus = ref('')
const requestDialogVisible = ref(false)
const requestOrders = ref([])
const requestLoading = ref(false)

const detailAttachments = ref([])

// 新增订单相关
const orderVisible = ref(false)
const orderSaving = ref(false)
const orderFormRef = ref()
const orderForm = ref({})
const orderItems = ref([])
const editOrderId = ref(null)
const orderRules = { date: [{ required: true, message: '请选择日期', trigger: 'change' }] }
const businessItems = ref([])
const businessCategories = ref([])
const employees = ref([])
const companies = ref([])
const customers = ref([])

// Bank accounts
const companyBankAccounts = ref([])

const fmtMoney = (v) => v != null ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'
const statusType = (s) => ({ '未签订': 'warning', '执行中': 'primary', '已完成': 'success', '已取消': 'danger' })[s] || 'info'
const getFileName = (url) => url ? decodeURIComponent(url.split('/').pop()) : ''
const getAttachmentList = (str) => str ? str.split(',').filter(Boolean) : []

const uploadUrl = computed(() => `/api/upload/contract`)
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }))

const amountItems = [
  { key: 'amount', label: '合同金额' },
  { key: 'receivable', label: '应收款' },
  { key: 'requested', label: '已请款' },
  { key: 'received', label: '已收款', color: '#52c41a' },
  { key: 'cost', label: '结算金额' },
  { key: 'tax', label: '税费' },
  { key: 'performance', label: '绩效' },
  { key: 'labor_cost', label: '劳务费' },
  { key: 'business_fee', label: '业务费' },
  { key: 'other', label: '其他费用' },
  { key: 'profit', label: '利润', color: '#1677ff' }
]

const rules = { name: [{ required: true, message: '请输入合同名称' }] }

const loadDetail = async () => {
  const res = await contractApi.get(route.params.id, { 
    page: pagination.value.page, 
    pageSize: pagination.value.pageSize 
  })
  if (res.success) {
    detail.value = res.data
    detailAttachments.value = getAttachmentList(res.data.contract?.attachment)
    if (res.data.pagination) {
      pagination.value.total = res.data.pagination.total
    }
  }
}

const startEditContractNo = () => {
  newContractNo.value = detail.value.contract?.contract_no || ''
  editingContractNo.value = true
}

const cancelEditContractNo = () => {
  editingContractNo.value = false
  newContractNo.value = ''
}

const saveContractNo = async () => {
  const trimmedNo = newContractNo.value.trim()
  if (!trimmedNo) {
    ElMessage.warning('合同编号不能为空')
    return
  }
  if (trimmedNo.length > 50) {
    ElMessage.warning('合同编号长度不能超过50个字符')
    return
  }
  if (!/^[A-Za-z0-9\-]+$/.test(trimmedNo)) {
    ElMessage.warning('合同编号只能包含字母、数字和连字符')
    return
  }
  
  savingContractNo.value = true
  try {
    const res = await contractApi.updateContractNo(route.params.id, trimmedNo)
    if (res.success) {
      ElMessage.success('合同编号更新成功')
      detail.value.contract.contract_no = trimmedNo
      editingContractNo.value = false
    } else {
      ElMessage.error(res.message || '更新失败')
    }
  } finally {
    savingContractNo.value = false
  }
}

const openEdit = () => {
  const c = detail.value.contract
  editForm.value = {
    name: c?.name || '',
    date: c?.date || '',
    customer_id: c?.customer_id || null,
    customer_name: c?.customer_name || '',
    project_id: c?.project_id || null,
    project_name: c?.project_name || '',
    dept_id: c?.dept_id || null,
    dept_name: c?.dept_name || '',
    status: c?.status || '未签订',
    manager: c?.manager || auth.user?.name || '',
    salesman: c?.salesman || '',
    salesman_id: c?.salesman_id || null,
    service_content: c?.service_content || '',
    amount: Number(c?.amount) || 0,
    receivable: Number(c?.receivable) || 0,
    requested: Number(c?.requested) || 0,
    received: Number(c?.received) || 0,
    cost: Number(c?.cost) || 0,
    tax: Number(c?.tax) || 0,
    labor_cost: Number(c?.labor_cost) || 0,
    business_fee: Number(c?.business_fee) || 0,
    other: Number(c?.other) || 0,
    performance: Number(c?.performance) || 0,
    profit: Number(c?.profit) || 0,
    company_id: c?.company_id || null,
    company_name: c?.company_name || '',
    bank_account_id: c?.bank_account_id || null
  }
  // Load bank accounts for the current company
  if (editForm.value.company_id) {
    loadCompanyBankAccounts(editForm.value.company_id)
  }
  editVisible.value = true
}

const loadCompanyBankAccounts = async (companyId) => {
  if (!companyId) {
    companyBankAccounts.value = []
    return
  }
  const res = await bankAccountApi.list({ company_id: companyId })
  if (res.success) {
    companyBankAccounts.value = res.data?.list || res.data || []
  }
}

const onCompanyChange = async (companyId) => {
  const company = companies.value.find(c => c.id === companyId)
  if (company) {
    editForm.value.company_name = company.name
    // Clear and reload bank accounts for new company
    editForm.value.bank_account_id = null
    await loadCompanyBankAccounts(companyId)
  }
}

const handleSave = async () => {
  try { await editFormRef.value.validate() } catch { return }
  saving.value = true
  try {
    const res = await contractApi.update(route.params.id, editForm.value)
    if (res.success) {
      ElMessage.success('保存成功')
      editVisible.value = false
      loadDetail()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } finally { saving.value = false }
}

const refreshAmount = async () => {
  refreshing.value = true
  try {
    const res = await contractApi.refresh(route.params.id)
    if (res.success) {
      ElMessage.success('金额已刷新')
      loadDetail()
    } else {
      ElMessage.error(res.message || '刷新失败')
    }
  } finally { refreshing.value = false }
}

const handleDetailUpload = (res) => {
  if (res.success) {
    detailAttachments.value.push(res.data.url)
    saveAttachments()
  } else {
    ElMessage.error('上传失败')
  }
}

const removeDetailAttachment = async (idx, url) => {
  try {
    await fetch('/api/upload/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ url })
    })
  } catch {}
  detailAttachments.value.splice(idx, 1)
  saveAttachments()
}

const saveAttachments = async () => {
  await contractApi.update(route.params.id, { attachment: detailAttachments.value.join(',') })
  if (detail.value.contract) detail.value.contract.attachment = detailAttachments.value.join(',')
}

// 按类别筛选业务
const filteredBusiness = (category) => {
  if (!category) return businessItems.value
  return businessItems.value.filter(b => b.category === category)
}

// 打开新增订单弹窗
const openOrderDialog = () => {
  editOrderId.value = null
  const c = detail.value.contract
  orderForm.value = {
    date: '',
    contract_id: route.params.id,
    contract_no: c?.contract_no || '',
    project_name: c?.name || '',
    customer_name: c?.customer_name || '',
    customer_id: c?.customer_id || null,
    total: 0,
    settlement_fee: 0,
    performance_fee: 0,
    manager: c?.manager || auth.user?.name || '',
    salesman: c?.salesman || auth.user?.name || '',
    report_date: '',
    report_no: '',
    status: '待处理',
    remark: '',
    dept_id: c?.dept_id || null,
    dept_name: c?.dept_name || '',
    company_id: c?.company_id || null,
    company_name: c?.company_name || '',
    bank_account_id: c?.bank_account_id || null,
    bank_account_name: c?.bank_account_name || ''
  }
  orderItems.value = []
  orderVisible.value = true
}

// 打开编辑订单弹窗
const openOrderEdit = async (row) => {
  editOrderId.value = row.id
  try {
    const res = await orderApi.get(row.id)
    if (res.success) {
      const o = res.data.order || res.data // 兼容两种返回格式
      orderForm.value = {
        date: o.date || '',
        contract_id: o.contract_id || route.params.id,
        contract_no: o.contract_no || '',
        project_name: o.project_name || '',
        customer_name: o.customer_name || '',
        customer_id: o.customer_id || null,
        total: Number(o.total) || 0,
        settlement_fee: Number(o.settlement_fee) || 0,
        performance_fee: Number(o.performance_fee) || 0,
        manager: o.manager || '',
        salesman: o.salesman || '',
        report_date: o.report_date || '',
        report_no: o.report_no || '',
        status: o.status || '待处理',
        remark: o.remark || '',
        dept_id: o.dept_id || null,
        dept_name: o.dept_name || '',
        company_id: o.company_id || null,
        company_name: o.company_name || '',
        bank_account_id: o.bank_account_id || null,
        bank_account_name: o.bank_account_name || ''
      }
      orderItems.value = (o.items || []).map(item => ({
        id: item.id, business_id: item.business_id || '', business_category: item.business_category || '',
        business_project: item.business_project || '', parameter: item.parameter || '',
        quantity: Number(item.quantity) || 1, unit_price: Number(item.unit_price) || 0,
        total: Number(item.total) || 0, settlement_fee: Number(item.settlement_fee) || 0,
        performance_fee: Number(item.performance_fee) || 0
      }))
      orderVisible.value = true
    }
  } catch { ElMessage.error('加载订单失败') }
}

// 添加明细行
const addOrderItem = () => {
  orderItems.value.push({
    business_id: '', business_category: '', business_project: '', parameter: '',
    quantity: 1, unit_price: 0, total: 0, settlement_fee: 0, performance_fee: 0
  })
}

// 删除订单
const handleOrderDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除订单 "${row.order_no}" 吗？删除后不可恢复。`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const res = await orderApi.delete(row.id)
    if (res.success) {
      ElMessage.success('订单已删除')
      loadDetail()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch {}
}

// 删除明细行
const removeOrderItem = (idx) => {
  orderItems.value.splice(idx, 1)
  calcOrderSummary()
}

// 选择客户时自动填充客户名称
const onCustomerChange = (customerId) => {
  if (customerId) {
    const c = customers.value.find(x => x.id === customerId)
    if (c) {
      editForm.value.customer_name = c.name
    }
  } else {
    editForm.value.customer_name = ''
  }
}

// 选择业务类别时
const onItemCategoryChange = (row) => {
  row.business_id = ''
  row.business_project = ''
}

// 选择业务项目时自动填充单价等
const onItemBusinessChange = (row) => {
  const b = businessItems.value.find(x => x.id === row.business_id)
  if (b) {
    row.business_category = b.category
    row.business_project = b.project
    row.parameter = b.parameter || ''
    row.unit_price = Number(b.unit_price) || 0
    row.settlement_fee = Number(b.settlement_fee) || 0
    row.performance_fee = Number(b.performance_fee) || 0
    calcItemTotal(row)
  }
}

// 计算单行金额
const calcItemTotal = (row) => {
  row.total = (row.quantity || 0) * (row.unit_price || 0)
  calcOrderSummary()
}

// 计算合计
const calcOrderSummary = () => {
  orderForm.value.total = orderItems.value.reduce((sum, r) => sum + (Number(r.total) || 0), 0)
  orderForm.value.settlement_fee = orderItems.value.reduce((sum, r) => sum + (Number(r.settlement_fee) || 0), 0)
  orderForm.value.performance_fee = orderItems.value.reduce((sum, r) => sum + (Number(r.performance_fee) || 0), 0)
}

// 保存订单
const handleOrderSave = async () => {
  try { await orderFormRef.value.validate() } catch { return }
  if (orderItems.value.length === 0) return ElMessage.warning('请至少添加一项业务明细')
  orderSaving.value = true
  try {
    const formData = { ...orderForm.value, items: orderItems.value }
    if (!formData.date || formData.date === 'Invalid date') delete formData.date
    if (!formData.report_date || formData.report_date === 'Invalid date') delete formData.report_date
    const res = editOrderId.value
      ? await orderApi.update(editOrderId.value, formData)
      : await orderApi.create(formData)
    if (res.success) {
      ElMessage.success(editOrderId.value ? '订单更新成功' : '订单创建成功')
      orderVisible.value = false
      loadDetail()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } finally { orderSaving.value = false }
}

const loadPaymentRequests = async () => {
  loadingPaymentRequests.value = true
  try {
    const res = await paymentRequestApi.list({ contract_id: route.params.id, pageSize: 1000 })
    if (res.success) {
      paymentRequests.value = res.data?.list || res.data || []
    }
  } finally {
    loadingPaymentRequests.value = false
  }
}

const handlePaymentRequestSelectionChange = (selection) => {
  selectedPaymentRequests.value = selection
}

const handleBatchDeletePaymentRequests = async () => {
  const ids = selectedPaymentRequests.value.map(item => item.id)
  if (ids.length === 0) return
  
  const canDelete = selectedPaymentRequests.value.every(item => 
    ['草稿', '待审核'].includes(item.request_status)
  )
  
  if (!canDelete) {
    ElMessage.warning('只能删除草稿或待审核状态的请款记录')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条请款记录吗？`,
      '批量删除确认',
      { type: 'warning' }
    )
    
    const res = await contractApi.batchDeletePaymentRequests(route.params.id, ids)
    if (res.success) {
      ElMessage.success(res.message || '删除成功')
      selectedPaymentRequests.value = []
      loadPaymentRequests()
      loadDetail()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleOrderSelectionChange = (selection) => {
  selectedOrders.value = selection
}

const handleRequestPayment = (order) => {
  requestOrders.value = [order]
  requestDialogVisible.value = true
}

const handleBatchRequest = () => {
  const validOrders = selectedOrders.value.filter(o => Number(o.total || 0) > 0)
  if (validOrders.length === 0) {
    ElMessage.warning('所选订单金额为0，无法请款')
    return
  }
  requestOrders.value = validOrders
  requestDialogVisible.value = true
}

const handleBatchDelete = async () => {
  if (selectedOrders.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedOrders.value.length} 条订单吗？`,
      '批量删除确认',
      { type: 'warning' }
    )
    
    const ids = selectedOrders.value.map(o => o.id)
    const res = await orderApi.batchDelete(ids)
    
    if (res.success) {
      ElMessage.success(res.data.message || '删除成功')
      selectedOrders.value = []
      loadDetail()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleBatchStatusChange = async () => {
  if (!batchTargetStatus.value) {
    ElMessage.warning('请选择目标状态')
    return
  }
  
  const ids = selectedOrders.value.map(o => o.id)
  const res = await orderApi.batchUpdateStatus(ids, batchTargetStatus.value)
  
  if (res.success) {
    ElMessage.success(res.data.message || '状态更新成功')
    showBatchStatusDialog.value = false
    batchTargetStatus.value = ''
    selectedOrders.value = []
    loadDetail()
  } else {
    ElMessage.error(res.message || '状态更新失败')
  }
}

const handleExportOrders = async () => {
  try {
    const res = await contractApi.exportOrders(route.params.id)
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const contractNo = detail.value.contract?.contract_no || 'contract'
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    link.download = `${contractNo}_订单列表_${dateStr}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

const handleConfirmRequest = async () => {
  if (requestOrders.value.length === 0) return
  
  requestLoading.value = true
  try {
    const orderIds = requestOrders.value.map(o => o.id)
    const totalAmount = requestOrders.value.reduce((sum, o) => sum + Number(o.total || 0), 0)
    
    const res = await paymentRequestBatchApi.createFromOrders({
      order_ids: orderIds,
      request_amount: totalAmount,
      date: new Date().toISOString().slice(0, 10)
    })
    
    if (res.success) {
      ElMessage.success(`请款成功，已创建请款批次`)
      requestDialogVisible.value = false
      requestOrders.value = []
      loadDetail()
      loadPaymentRequests()
    } else {
      ElMessage.error(res.message || '请款失败')
    }
  } finally {
    requestLoading.value = false
  }
}

onMounted(async () => {
  await auth.fetchUser()
  loadDetail()
  loadPaymentRequests()
  const [br, er, cr, cu] = await Promise.all([businessApi.all(), employeeApi.all(), companyApi.all(), customerApi.all()])
  if (br.success) {
    businessItems.value = br.data
    businessCategories.value = [...new Set(br.data.map(b => b.category).filter(Boolean))]
  }
  if (er.success) employees.value = er.data
  if (cr.success) companies.value = cr.data
  if (cu.success) customers.value = cu.data
})
</script>

<style scoped>
.page-container { padding: 20px; background: #f5f7fa; min-height: calc(100vh - 84px); }
.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.page-header :deep(.el-page-header__title) { font-size: 18px; font-weight: 600; color: #303133; }
.page-header :deep(.el-page-header__content) { font-size: 16px; color: #606266; }
:deep(.el-card) { border-radius: 8px; border: none; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
:deep(.el-card__header) { padding: 14px 16px; border-bottom: 1px solid #f0f0f0; }
:deep(.el-card__body) { padding: 16px; }
.card-title { font-size: 15px; font-weight: 600; color: #303133; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.amount-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.amount-item { text-align: center; padding: 16px 10px; background: linear-gradient(135deg, #f0f5ff 0%, #fafbff 100%); border-radius: 8px; transition: all 0.3s; }
.amount-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(22,119,255,0.15); }
.amount-val { font-size: 18px; font-weight: 700; color: #1677ff; }
.amount-label { font-size: 12px; color: #909399; margin-top: 6px; }
:deep(.el-table) { border-radius: 8px; overflow: hidden; }
:deep(.el-table th) { background: #fafafa !important; font-weight: 600; color: #606266; }
:deep(.el-table td) { padding: 10px 0; }
:deep(.el-table--border) { border: 1px solid #ebeef5; }
:deep(.el-tag) { border-radius: 4px; }
.summary-mini { display: flex; flex-direction: column; gap: 8px; }
.sm-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.sm-label { color: #909399; font-size: 13px; }
.sm-val { font-weight: 600; color: #1677ff; }
.file-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.file-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #f5f7fa; border-radius: 4px; }
.file-icon { color: #409eff; }
.file-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.no-file { color: #999; font-size: 13px; padding: 8px 0; }
.items-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.items-summary { display: flex; gap: 20px; font-size: 14px; }
.items-summary b { color: #409eff; }
.money { color: #409eff; font-weight: 600; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
.contract-no-cell { display: flex; align-items: center; gap: 8px; }
</style>
