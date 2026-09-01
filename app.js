// デフォルトのマスタータスク（ご指定の内容に更新）
const defaultMasterTasks = [
  { id: 1, name: '朝ごはん', duration: 30, selected: true },
  { id: 2, name: 'お弁当', duration: 60, selected: true },
  { id: 3, name: '歯磨き', duration: 10, selected: true },
  { id: 4, name: 'シャワー', duration: 20, selected: true },
  { id: 5, name: '化粧', duration: 25, selected: true },
  { id: 6, name: '着替え', duration: 7, selected: true },
  { id: 7, name: '洗濯', duration: 8, selected: true }
];

let masterTasks = JSON.parse(localStorage.getItem('morning_master_tasks')) || defaultMasterTasks;
let taskStates = JSON.parse(localStorage.getItem('morning_states')) || {};

document.addEventListener('DOMContentLoaded', () => {
  renderTaskInputs();
  calculateSchedule();

  document.getElementById('add-task-btn').addEventListener('click', () => {
    saveTaskInputs();
    masterTasks.push({ id: Date.now(), name: '', duration: 10, selected: true });
    renderTaskInputs();
  });

  document.getElementById('calculate-btn').addEventListener('click', () => {
    saveTaskInputs();
    calculateSchedule();
  });

  document.getElementById('departure-time').addEventListener('change', calculateSchedule);
  
  document.getElementById('reset-btn').addEventListener('click', () => {
    taskStates = {};
    localStorage.removeItem('morning_states');
    calculateSchedule();
  });
});

function renderTaskInputs() {
  const container = document.getElementById('task-inputs');
  container.innerHTML = '';

  masterTasks.forEach((task, index) => {
    const row = document.createElement('div');
    row.className = 'task-input-row';
    row.innerHTML = `
      <input type="checkbox" class="input-select" ${task.selected ? 'checked' : ''} data-index="${index}">
      <input type="text" value="${escapeHtml(task.name)}" placeholder="タスク名" class="input-name" data-index="${index}">
      <input type="number" value="${task.duration}" placeholder="分" class="input-duration" data-index="${index}">分
      <button class="btn-del" onclick="removeTask(${index})">✕</button>
    `;
    container.appendChild(row);
  });

  const inputs = container.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', saveTaskInputs);
    input.addEventListener('change', saveTaskInputs);
  });
}

function removeTask(index) {
  saveTaskInputs();
  masterTasks.splice(index, 1);
  renderTaskInputs();
  calculateSchedule();
}

function saveTaskInputs() {
  const selects = document.querySelectorAll('.input-select');
  const names = document.querySelectorAll('.input-name');
  const durations = document.querySelectorAll('.input-duration');

  names.forEach((el, i) => {
    if (masterTasks[i]) {
      masterTasks[i].name = el.value;
      masterTasks[i].duration = parseInt(durations[i].value) || 0;
      masterTasks[i].selected = selects[i].checked;
    }
  });

  localStorage.setItem('morning_master_tasks', JSON.stringify(masterTasks));
}

// 時間計算＆自動傾斜配分ロジック（未完了タスク全体の再計算対応）
function calculateSchedule() {
  const depTimeStr = document.getElementById('departure-time').value;
  const selectedTasks = masterTasks.filter(t => t.selected && t.name.trim() !== '');

  if (!depTimeStr || selectedTasks.length === 0) {
    document.getElementById('calc-start-time').textContent = '--:--';
    document.getElementById('task-list').innerHTML = '<li style="padding:15px; text-align:center; color:#888;">タスクが選択されていないか、名前が空です</li>';
    return;
  }

  const today = new Date();
  const [depH, depM] = depTimeStr.split(':').map(Number);
  let depDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), depH, depM, 0);

  // 1. 初期の理想開始時刻を計算
  let totalMinutes = selectedTasks.reduce((sum, t) => sum + t.duration, 0);
  let initialStartDate = new Date(depDate.getTime() - totalMinutes * 60000);
  
  document.getElementById('calc-start-time').textContent = formatTime(initialStartDate);

  // 2. 現在の「最新の完了完了時刻」または「初期開始時刻」を取得（全体の進行基準点）
  let latestCompletedTime = new Date(initialStartDate.getTime());
  
  // 完了済みの全タスクの中で、一番最後に完了チェックされた時間を探す
  selectedTasks.forEach(task => {
    const state = taskStates[task.id];
    if (state && state.done && state.completedAt) {
      const completedDate = new Date(state.completedAt);
      if (completedDate > latestCompletedTime) {
        latestCompletedTime = completedDate;
      }
    }
  });

  // 3. 上下に散らばっている「未完了タスク」の合計所要時間を集計
  const uncompletedTasks = selectedTasks.filter(t => !taskStates[t.id] || !taskStates[t.id].done);
  const remainingTotalOriginalMinutes = uncompletedTasks.reduce((sum, t) => sum + t.duration, 0);

  // 残り利用可能な時間（分）
  const availableMinutes = (depDate - latestCompletedTime) / 60000;

  // 4. スケジュール描画
  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '';

  let currentStartTime = new Date(initialStartDate.getTime());
  let runningUncompletedStart = new Date(latestCompletedTime.getTime());

  selectedTasks.forEach((task) => {
    const state = taskStates[task.id] || { done: false, completedAt: null };
    const li = document.createElement('li');
    li.className = `task-item ${state.done ? 'completed' : ''}`;

    if (state.done && state.completedAt) {
      // --- 【完了済みタスクの表示】 ---
      const actualDate = new Date(state.completedAt);
      const scheduledEnd = new Date(currentStartTime.getTime() + task.duration * 60000);
      const isDelayed = actualDate > scheduledEnd;
      const delayMinutes = isDelayed ? Math.round((actualDate - scheduledEnd) / 60000) : 0;

      const timeColorStyle = isDelayed ? 'color: #E74C3C;' : 'color: #2ECC71;';
      const delayBadge = isDelayed ? ` <span style="color:#E74C3C; font-weight:bold;">[遅れ ${delayMinutes}分]</span>` : '';
      const actualTimeString = `<div class="actual-time" style="${timeColorStyle} font-weight:bold;">完了: ${formatTime(actualDate)}${delayBadge}</div>`;

      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" checked onchange="toggleTask(${task.id})">
        <div class="task-info">
          <div class="task-name">${escapeHtml(task.name)} (${task.duration}分)</div>
          <div class="task-time">当初予定: ${formatTime(currentStartTime)} ～ ${formatTime(scheduledEnd)}</div>
          ${actualTimeString}
        </div>
      `;

      currentStartTime = scheduledEnd;

    } else {
      // --- 【未完了タスクの表示（再計算）】 ---
      let allocatedDuration = task.duration;

      // 残り時間が押している（かつ未完了タスクが存在する）場合は時間比率で割り振る
      if (availableMinutes > 0 && remainingTotalOriginalMinutes > 0 && availableMinutes < remainingTotalOriginalMinutes) {
        allocatedDuration = (task.duration / remainingTotalOriginalMinutes) * availableMinutes;
      } else if (availableMinutes <= 0) {
        allocatedDuration = 1; // 時間切れの場合は最小1分表記
      }

      const scheduledEnd = new Date(runningUncompletedStart.getTime() + allocatedDuration * 60000);

      li.innerHTML = `
        <input type="checkbox" class="task-checkbox" onchange="toggleTask(${task.id})">
        <div class="task-info">
          <div class="task-name">${escapeHtml(task.name)} (${task.duration}分)</div>
          <div class="task-time">予定: ${formatTime(runningUncompletedStart)} ～ ${formatTime(scheduledEnd)}</div>
        </div>
      `;

      // 次の未完了タスクのための開始時間を進める
      runningUncompletedStart = scheduledEnd;
      currentStartTime = new Date(currentStartTime.getTime() + task.duration * 60000);
    }

    listEl.appendChild(li);
  });
}

function toggleTask(taskId) {
  if (!taskStates[taskId]) {
    taskStates[taskId] = { done: false, completedAt: null };
  }
  
  taskStates[taskId].done = !taskStates[taskId].done;
  taskStates[taskId].completedAt = taskStates[taskId].done ? new Date().toISOString() : null;

  localStorage.setItem('morning_states', JSON.stringify(taskStates));
  calculateSchedule();
}

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
