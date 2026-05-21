const { generateDailySnapshots } = require('./statsSnapshot');

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const SNAPSHOT_HOUR = 1;
const SNAPSHOT_MINUTE = 5;

function formatDate(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function shouldRunNow(now = new Date()) {
  return now.getHours() === SNAPSHOT_HOUR && now.getMinutes() >= SNAPSHOT_MINUTE && now.getMinutes() < SNAPSHOT_MINUTE + 30;
}

async function ensureSnapshotForDate(date, models) {
  const targetDate = formatDate(date);
  const existing = await models.DeptStats.count({ where: { date: targetDate } });
  if (existing > 0) {
    return { skipped: true, date: targetDate, reason: '快照已存在' };
  }
  return generateDailySnapshots(targetDate, models);
}

function startSnapshotScheduler(models) {
  let running = false;

  const runner = async (mode = 'interval') => {
    if (running) return;
    const now = new Date();
    const today = formatDate(now);

    if (mode === 'interval' && !shouldRunNow(now)) {
      return;
    }

    running = true;
    try {
      const result = await ensureSnapshotForDate(today, models);
      if (result?.skipped) {
        console.log(`[snapshot-scheduler] ${today} skipped: ${result.reason}`);
      } else {
        console.log(`[snapshot-scheduler] ${today} generated`, result);
      }
    } catch (err) {
      console.error('[snapshot-scheduler] failed:', err.message);
    } finally {
      running = false;
    }
  };

  runner('startup').catch(() => {});
  const timer = setInterval(() => {
    runner('interval').catch(() => {});
  }, CHECK_INTERVAL_MS);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  console.log(`[snapshot-scheduler] started, checks every ${CHECK_INTERVAL_MS / 60000} minutes`);
  return timer;
}

module.exports = {
  ensureSnapshotForDate,
  startSnapshotScheduler,
};
