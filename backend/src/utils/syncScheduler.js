const cron = require('node-cron');
const orgSync = require('./orgSync');
const consistencyCheck = require('./consistencyCheck');
const { SyncTask, SyncLog, Employee } = require('../models');

class SyncScheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  start() {
    console.log('[sync-scheduler] Starting sync scheduler...');

    const incrementalSyncJob = cron.schedule('0 * * * *', async () => {
      console.log('[sync-scheduler] Running incremental sync job...');
      try {
        const result = await orgSync.executeIncrementalSync();
        console.log(`[sync-scheduler] Incremental sync completed: ${result.syncedCount} records synced`);
      } catch (error) {
        console.error('[sync-scheduler] Incremental sync failed:', error.message);
        this.sendAlert('增量同步失败', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    this.jobs.push({
      name: 'incremental-sync',
      job: incrementalSyncJob,
      schedule: '每小时执行一次'
    });

    const consistencyCheckJob = cron.schedule('0 2 * * *', async () => {
      console.log('[sync-scheduler] Running consistency check job...');
      try {
        const result = await consistencyCheck.checkAllConsistency();
        console.log(`[sync-scheduler] Consistency check completed: ${result.totalInconsistent} inconsistencies found`);
        
        if (result.totalInconsistent > 10) {
          this.sendAlert(
            '数据一致性问题告警',
            `检测到 ${result.totalInconsistent} 条不一致数据，请及时处理`
          );
        }
      } catch (error) {
        console.error('[sync-scheduler] Consistency check failed:', error.message);
        this.sendAlert('一致性检测失败', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    this.jobs.push({
      name: 'consistency-check',
      job: consistencyCheckJob,
      schedule: '每日凌晨2点执行'
    });

    const taskMonitorJob = cron.schedule('*/10 * * * *', async () => {
      console.log('[sync-scheduler] Monitoring sync tasks...');
      try {
        const runningTasks = await SyncTask.count({ where: { status: 'running' } });
        
        if (runningTasks > 0) {
          console.log(`[sync-scheduler] ${runningTasks} sync tasks are currently running`);
        }

        const pendingTasks = await SyncTask.count({ where: { status: 'pending' } });
        if (pendingTasks > 100) {
          this.sendAlert(
            '同步任务积压告警',
            `有 ${pendingTasks} 个待处理同步任务，请关注`
          );
        }
      } catch (error) {
        console.error('[sync-scheduler] Task monitoring failed:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai'
    });

    this.jobs.push({
      name: 'task-monitor',
      job: taskMonitorJob,
      schedule: '每10分钟执行一次'
    });

    console.log('[sync-scheduler] Sync scheduler started with', this.jobs.length, 'jobs');
    this.isRunning = true;
  }

  stop() {
    console.log('[sync-scheduler] Stopping sync scheduler...');
    for (const jobInfo of this.jobs) {
      jobInfo.job.stop();
    }
    this.jobs = [];
    this.isRunning = false;
    console.log('[sync-scheduler] Sync scheduler stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: this.jobs.map(j => ({
        name: j.name,
        schedule: j.schedule
      }))
    };
  }

  async sendAlert(title, message) {
    console.warn(`[sync-scheduler ALERT] ${title}: ${message}`);
    
    try {
      const admins = await Employee.findAll({
        where: { role: 'admin', status: 1 },
        attributes: ['id', 'name', 'phone']
      });

      console.log(`[sync-scheduler] Alert sent to ${admins.length} admin users: ${title}`);
    } catch (error) {
      console.error('[sync-scheduler] Failed to send alert:', error.message);
    }
  }

  async runManualSync(syncType = 'incremental') {
    if (syncType === 'incremental') {
      return await orgSync.executeIncrementalSync();
    } else if (syncType === 'consistency') {
      return await consistencyCheck.checkAllConsistency();
    } else {
      throw new Error(`Unknown sync type: ${syncType}`);
    }
  }
}

const scheduler = new SyncScheduler();

module.exports = {
  startSyncScheduler: () => scheduler.start(),
  stopSyncScheduler: () => scheduler.stop(),
  getSyncSchedulerStatus: () => scheduler.getStatus(),
  runManualSync: (type) => scheduler.runManualSync(type)
};
