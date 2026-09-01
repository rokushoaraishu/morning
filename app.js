const defaultMasterTasks = [
  { id: 1, name: '朝食', duration: 30, selected: true },
  { id: 2, name: 'お弁当', duration: 60, selected: true },
  { id: 3, name: '歯磨き', duration: 15, selected: true },
  { id: 4, name: 'シャワー', duration: 20, selected:  true },
  { id: 5, name: '化粧', duration: 25, selected: true },
  { id: 6, name: 'ヘアセット', duration: 5, selected: true },
  { id: 7, name: '着替え', duration: 7, selected: true },
  { id: 8, name: '洗濯', duration: 8, selected: true }
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

function moveUp(index) {
  if (index <= 0) return;
  saveTaskInputs();
  const temp = masterTasks[index];
  masterTasks[index] = masterTasks[index - 1];
  masterTasks[index - 1] = temp;
  renderTaskInputs();
}

function moveDown(index) {
  if (index >= masterTasks.length - 1) return;
  saveTaskInputs();
  const temp = masterTasks[index];
  masterTasks[index] = masterTasks[index + 1];
  masterTasks[index + 1] = temp;
  renderTaskInputs();
}

function renderTaskInputs() {
  const container = document.getElementById('task-inputs');
  container.innerHTML = '';

  masterTasks.forEach((task, index) => {
    const row = document.createElement('div');
    row.className = 'task-input-row';
    row.innerHTML = `
      <div class="order-btns">
        <button class="btn-move" onclick="moveUp(${index})" ${index === 0 ? 'disabled' : ''}>▲</button>
        <button class="btn-move" onclick="moveDown(${index})" ${index === masterTasks.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
      <input type="checkbox" class="input-select" ${task.selected ? 'checked' : ''} data-index="${index}">
      <input type="text" value="${task.name}" placeholder="タスク名" class="input-name" data-index="${index}">
      <input type="number" value="${task.duration}" placeholder="分" class="input-duration" data-index="${index}">分
      <button class="btn-del" onclick="removeTask(${index})">✕</button>
    `;
    container.appendChild(row);
  });
}

function removeTask(index) {
  saveTaskInputs();
  masterTasks.splice(index, 1);
  renderTaskInputs();
}

function saveTaskInputs() {
  const selects = document.querySelectorAll('.input-select');
  const names = document.querySelectorAll('.input-name');
  const durations = document.querySelectorAll('.input-duration');

  names.forEach((el, i) => {
    if (masterTasks[i]) {
      masterTasks[i].name = el.value.trim();
      masterTasks[i].duration = parseInt(durations[i].value) || 0;
      masterTasks[i].selected = selects[i].checked;
    }
  });
  localStorage.setItem('morning_master_tasks', JSON.stringify(masterTasks));
}

function calculateSchedule() {
  const depTimeStr = document.getElementById('departure-time').value;
  const selectedTasks = masterTasks.filter(t => t.selected && t.name !== '');

  if (!depTimeStr || selectedTasks.length === 0) {
    document.getElementById('calc-start-time').textContent = '--:--';
    document.getElementById('task-list').innerHTML = '<li style="padding:15px; text-align:center; color:#888;">タスクが選択されていません</li>';
    return;
  }

  const today = new Date();
  const [depH, depM] = depTimeStr.split(':').map(Number);
  let depDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), depH, depM, 0);

  // 全タスクの合計所要時間から、最初の開始時刻を計算
  let totalMinutes = selectedTasks.reduce((sum, t) => sum + t.duration, 0);
  let initialStartDate = new Date(depDate.getTime() - totalMinutes * 60000);
  
  document.getElementById('calc-start-time').textContent = formatTime(initialStartDate);

  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '';

  let currentStartTime = new Date(initialStartDate.getTime());

  selectedTasks.forEach((task) => {
    const state = taskStates[task.id] || { done: false, completedAt: null };
    
    // 終了予定時刻（1つの時刻）を計算
    let targetEndTime = new Date(currentStartTime.getTime() + task.duration * 60000);

    const li = document.createElement('li');
    li.className = `task-item ${state.done ? 'completed' : ''}`;

    let actualTimeString = '';
    if (state.done && state.completedAt) {
      const actualDate = new Date(state.completedAt);
      actualTimeString = `(完了記録: ${formatTime(actualDate)})`;
      
      // 遅延・前倒しが発生した場合、実際の完了時刻をベースに次のタスクの起点を上書き
      currentStartTime = actualDate;
      targetEndTime = new Date(currentStartTime.getTime() + task.duration * 60000);
    }

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${state.done ? 'checked' : ''} onchange="toggleTask(${task.id})">
      <div class="task-info">
        <div class="task-name">${task.name} (${task.duration}分)</div>
        <div class="task-time">完了目標: <strong>${formatTime(targetEndTime)}</strong> まで</div>
        ${actualTimeString ? `<div class="actual-time">${actualTimeString}</div>` : ''}
      </div>
    `;

    listEl.appendChild(li);

    // 未完了タスクの場合、次のタスクの開始基準時刻は「このタスクの目標終了時刻」になる
    if (!state.done) {
      currentStartTime = targetEndTime;
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
