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

  // 1分ごとに画面を更新して、未完了タスクの遅延（赤字化）をリアルタイム判定
  setInterval(calculateSchedule, 60000);

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

  const now = new Date();
  const today = new Date();
  const [depH, depM] = depTimeStr.split(':').map(Number);
  let depDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), depH, depM, 0);

  // 初期予定の算出（基準値）
  let totalMinutes = selectedTasks.reduce((sum, t) => sum + t.duration, 0);
  let initialStartDate = new Date(depDate.getTime() - totalMinutes * 60000);
  
  document.getElementById('calc-start-time').textContent = formatTime(initialStartDate);

  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '';

  let currentStartTime = new Date(initialStartDate.getTime());

  selectedTasks.forEach((task) => {
    const state = taskStates[task.id] || { done: false, completedAt: null };
    
    // このタスクの目標完了時刻
    let targetEndTime = new Date(currentStartTime.getTime() + task.duration * 60000);
    
    const li = document.createElement('li');
    li.className = `task-item ${state.done ? 'completed' : ''}`;

    let timeDisplayHtml = '';
    
    if (state.done && state.completedAt) {
      // --- 【完了済みタスクの表示処理】 ---
      const actualDate = new Date(state.completedAt);
      // 当初の目標より遅れて完了した場合は赤文字
      const isDelayed = actualDate > targetEndTime;
      const colorStyle = isDelayed ? 'color: #E74C3C; font-weight: bold;' : 'color: #2ECC71; font-weight: bold;';
      
      timeDisplayHtml = `
        <div class="task-time">完了目標: ${formatTime(targetEndTime)} まで</div>
        <div style="${colorStyle} font-size: 0.85rem;">(完了記録: ${formatTime(actualDate)}${isDelayed ? ' ⚠️遅延' : ''})</div>
      `;
      
      // 次のタスクへの引き継ぎ時刻を「実際の完了時刻」に更新
      currentStartTime = actualDate;
    } else {
      // --- 【未完了タスクの表示処理】 ---
      // 現在時刻がすでに目標時間を過ぎている場合は赤文字で警告！
      const isOverdue = now > targetEndTime;
      const timeStyle = isOverdue ? 'color: #E74C3C; font-weight: bold;' : 'color: #666;';
      
      timeDisplayHtml = `
        <div class="task-time" style="${timeStyle}">
          完了目標: <strong>${formatTime(targetEndTime)}</strong> まで ${isOverdue ? '⚠️遅延中' : ''}
        </div>
      `;
      
      // 未完了タスクの目標終了時間を次のタスクの開始基準にする
      currentStartTime = targetEndTime;
    }

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${state.done ? 'checked' : ''} onchange="toggleTask(${task.id})">
      <div class="task-info">
        <div class="task-name">${task.name} (${task.duration}分)</div>
        ${timeDisplayHtml}
      </div>
    `;

    listEl.appendChild(li);
  });
}

// チェックボックスを押した時の連動処理
function toggleTask(taskId) {
  const selectedTasks = masterTasks.filter(t => t.selected && t.name !== '');
  const targetIndex = selectedTasks.findIndex(t => t.id === taskId);
  const nowIso = new Date().toISOString();

  if (targetIndex !== -1) {
    const isCurrentlyDone = taskStates[taskId]?.done;

    if (!isCurrentlyDone) {
      // チェックを入れた場合：選択したタスク「およびそれより上の未完了タスク」を全て完了扱いにする
      for (let i = 0; i <= targetIndex; i++) {
        const id = selectedTasks[i].id;
        if (!taskStates[id] || !taskStates[id].done) {
          taskStates[id] = { done: true, completedAt: nowIso };
        }
      }
    } else {
      // チェックを外した場合：対象のタスクの完了状態を解除
      taskStates[taskId] = { done: false, completedAt: null };
    }
  }

  localStorage.setItem('morning_states', JSON.stringify(taskStates));
  calculateSchedule();
}

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

