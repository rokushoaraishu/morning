// デフォルトのマスタータスク
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

// 時間計算＆自動傾斜配分ロジック
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

  // 初期の理想開始時刻を計算
  let totalMinutes = selectedTasks.reduce((sum, t) => sum + t.duration, 0);
  let initialStartDate = new Date(depDate.getTime() - totalMinutes * 60000);
  
  document.getElementById('calc-start-time').textContent = formatTime(initialStartDate);

  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '';

  let currentStartTime = new Date(initialStartDate.getTime());

  selectedTasks.forEach((task, index) => {
    const state = taskStates[task.id] || { done: false, completedAt: null };
    
    // 当初の予定終了時刻
    let scheduledEnd = new Date(currentStartTime.getTime() + task.duration * 60000);
    let isDelayed = false;
    let delayMinutes = 0;
    let actualTimeString = '';

    if (state.done && state.completedAt) {
      const actualDate = new Date(state.completedAt);
      
      // 遅延判定（完了時刻が予定終了時刻を超えているか）
      if (actualDate > scheduledEnd) {
        isDelayed = true;
        delayMinutes = Math.round((actualDate - scheduledEnd) / 60000);
      }

      const timeColorStyle = isDelayed ? 'color: #E74C3C;' : 'color: #2ECC71;';
      const delayBadge = isDelayed ? ` <span style="color:#E74C3C; font-weight:bold;">[遅れ ${delayMinutes}分]</span>` : '';
      
      actualTimeString = `<div class="actual-time" style="${timeColorStyle} font-weight:bold;">完了: ${formatTime(actualDate)}${delayBadge}</div>`;

      // 次のタスクのための基準時間を完了実効時刻にする
      currentStartTime = actualDate;
    }

    const li = document.createElement('li');
    li.className = `task-item ${state.done ? 'completed' : ''}`;

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${state.done ? 'checked' : ''} onchange="toggleTask(${task.id})">
      <div class="task-info">
        <div class="task-name">${escapeHtml(task.name)} (${task.duration}分)</div>
        <div class="task-time">予定: ${formatTime(currentStartTime)} ～ ${formatTime(scheduledEnd)}</div>
        ${actualTimeString}
      </div>
    `;

    listEl.appendChild(li);

    // 未完了タスクの配分計算
    if (!state.done) {
      // 残りの未完了タスクとそれらの合計設定時間
      const remainingTasks = selectedTasks.slice(index + 1);
      const remainingOriginalMinutes = remainingTasks.reduce((sum, t) => sum + t.duration, 0) + task.duration;
      
      // 目標出発時刻までの残り利用可能時間（ミリ秒 ➔ 分）
      const availableMinutes = (depDate - currentStartTime) / 60000;

      // もし時間が押していて、残りの合計予定時間が利用可能時間を超えている場合は【割合配分】
      let allocatedDuration = task.duration;
      if (availableMinutes > 0 && remainingOriginalMinutes > 0 && availableMinutes < remainingOriginalMinutes) {
        // 元の所要時間の割合に応じて、残された時間を圧縮配分
        allocatedDuration = (task.duration / remainingOriginalMinutes) * availableMinutes;
      } else if (availableMinutes <= 0) {
        allocatedDuration = 1; // 限界を超えている場合は1分扱いにする
      }

      // 圧縮された配分時間をもとに次のタスクの開始時刻を更新
      currentStartTime = new Date(currentStartTime.getTime() + allocatedDuration * 60000);
    }
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
