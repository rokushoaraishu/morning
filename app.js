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
let startTime = localStorage.getItem('morning_start_time') || null;

document.addEventListener('DOMContentLoaded', () => {
  renderTaskInputs();
  calculateSchedule();

  // 1分ごとに画面を更新して遅延をリアルタイム判定
  setInterval(calculateSchedule, 60000);

  // タスク追加
  document.getElementById('add-task-btn').addEventListener('click', () => {
    saveTaskInputs();
    masterTasks.push({ id: Date.now(), name: '', duration: 10, selected: true });
    renderTaskInputs();
  });

  // 全削除ボタン
  document.getElementById('clear-all-btn').addEventListener('click', () => {
    if (confirm('すべてのタスクを削除しますか？')) {
      masterTasks = [];
      localStorage.setItem('morning_master_tasks', JSON.stringify(masterTasks));
      renderTaskInputs();
      calculateSchedule();
    }
  });

  // デフォルトに戻すボタン
  document.getElementById('reset-default-btn').addEventListener('click', () => {
    if (confirm('タスクリストを初期状態に戻しますか？')) {
      masterTasks = JSON.parse(JSON.stringify(defaultMasterTasks));
      localStorage.setItem('morning_master_tasks', JSON.stringify(masterTasks));
      renderTaskInputs();
      calculateSchedule();
    }
  });

  // 今日のスケジュール作成ボタン
  document.getElementById('calculate-btn').addEventListener('click', () => {
    saveTaskInputs();
    calculateSchedule();
  });

  document.getElementById('departure-time').addEventListener('change', calculateSchedule);
  
  // 進捗リセットボタン
  document.getElementById('reset-btn').addEventListener('click', () => {
    taskStates = {};
    startTime = null;
    localStorage.removeItem('morning_states');
    localStorage.removeItem('morning_start_time');
    calculateSchedule();
  });
});

// 準備スタートボタンを押した時
function startMorning() {
  startTime = new Date().toISOString();
  localStorage.setItem('morning_start_time', startTime);
  calculateSchedule();
}

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

  // 初期予定の計算
  let totalMinutes = selectedTasks.reduce((sum, t) => sum + t.duration, 0);
  let initialStartDate = new Date(depDate.getTime() - totalMinutes * 60000);
  
  document.getElementById('calc-start-time').textContent = formatTime(initialStartDate);

  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '';

  // スタートボタン枠の表示設定
  const startBoxHtml = `
    <div style="margin-bottom: 15px; text-align: center;">
      ${startTime ? 
        `<div style="font-size:0.9rem; color:#2ECC71; font-weight:bold;">🚀 準備スタート完了 (${formatTime(new Date(startTime))})</div>` : 
        `<button onclick="startMorning()" class="btn btn-primary" style="background:#2ECC71;">🚀 今から準備スタート！</button>`
      }
    </div>
  `;

  let currentStartTime = startTime ? new Date(startTime) : new Date(initialStartDate.getTime());
  let lastActionTime = new Date(currentStartTime.getTime()); // 直前の完了（またはスタート）時刻

  selectedTasks.forEach((task) => {
    const state = taskStates[task.id] || { done: false, completedAt: null };
    let targetEndTime = new Date(currentStartTime.getTime() + task.duration * 60000);
    
    const li = document.createElement('li');
    li.className = `task-item ${state.done ? 'completed' : ''}`;

    let timeDisplayHtml = '';
    
    if (state.done && state.completedAt) {
      // --- 【完了済みタスクの処理】 ---
      const actualDate = new Date(state.completedAt);
      
      // かかった時間（所要時間）の計算
      const diffMs = actualDate.getTime() - lastActionTime.getTime();
      const actualDuration = Math.max(0, Math.round(diffMs / 60000)); // 分単位
      
      const isDelayed = actualDate > targetEndTime;
      const colorStyle = isDelayed ? 'color: #E74C3C; font-weight: bold;' : 'color: #2ECC71; font-weight: bold;';
      
      timeDisplayHtml = `
        <div class="task-time">完了目標: ${formatTime(targetEndTime)} まで</div>
        <div style="${colorStyle} font-size: 0.85rem;">
          完了: ${formatTime(actualDate)} <span style="background:#EAEAEA; padding:2px 6px; border-radius:4px; margin-left:4px;">[所要時間: ${actualDuration}分]</span> ${isDelayed ? '⚠️遅延' : ''}
        </div>
      `;
      
      // 次の計算の基準時間を更新
      lastActionTime = actualDate;
      currentStartTime = actualDate;
    } else {
      // --- 【未完了タスクの処理】 ---
      const isOverdue = now > targetEndTime;
      const timeStyle = isOverdue ? 'color: #E74C3C; font-weight: bold;' : 'color: #666;';
      
      timeDisplayHtml = `
        <div class="task-time" style="${timeStyle}">
          完了目標: <strong>${formatTime(targetEndTime)}</strong> まで ${isOverdue ? '⚠️遅延中' : ''}
        </div>
      `;
      
      currentStartTime = targetEndTime;
    }

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${state.done ? 'checked' : ''} onchange="toggleTask(${task.id})">
      <div class="task-info">
        <div class="task-name">${task.name} (${task.duration}分設定)</div>
        ${timeDisplayHtml}
      </div>
    `;

    listEl.appendChild(li);
  });

  // リストの先頭にスタートボタンを挿入
  listEl.insertAdjacentHTML('afterbegin', startBoxHtml);
}

function toggleTask(taskId) {
  const selectedTasks = masterTasks.filter(t => t.selected && t.name !== '');
  const targetIndex = selectedTasks.findIndex(t => t.id === taskId);
  const nowIso = new Date().toISOString();

  if (targetIndex !== -1) {
    const isCurrentlyDone = taskStates[taskId]?.done;

    if (!isCurrentlyDone) {
      // 準備スタートボタンを押していない状態でチェックを入れた場合、現在時刻で自動スタート扱いにする
      if (!startTime) {
        startTime = nowIso;
        localStorage.setItem('morning_start_time', startTime);
      }

      for (let i = 0; i <= targetIndex; i++) {
        const id = selectedTasks[i].id;
        if (!taskStates[id] || !taskStates[id].done) {
          taskStates[id] = { done: true, completedAt: nowIso };
        }
      }
    } else {
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

