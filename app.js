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

  setInterval(calculateSchedule, 60000);

  document.getElementById('add-task-btn').addEventListener('click', () => {
    saveTaskInputs();
    masterTasks.push({ id: Date.now(), name: '', duration: 10, selected: true });
    renderTaskInputs();
  });

  document.getElementById('clear-all-btn').addEventListener('click', () => {
    if (confirm('すべてのタスクを削除しますか？')) {
      masterTasks = [];
      localStorage.setItem('morning_master_tasks', JSON.stringify(masterTasks));
      renderTaskInputs();
      calculateSchedule();
    }
  });

  document.getElementById('reset-default-btn').addEventListener('click', () => {
    if (confirm('タスクリストを初期状態に戻しますか？')) {
      masterTasks = JSON.parse(JSON.stringify(defaultMasterTasks));
      localStorage.setItem('morning_master_tasks', JSON.stringify(masterTasks));
      renderTaskInputs();
      calculateSchedule();
    }
  });

  // 「今日のスケジュール作成」ボタン：実行リストの進捗状態も完全にリセットして再作成
  document.getElementById('calculate-btn').addEventListener('click', () => {
    saveTaskInputs();
    resetProgress();
    calculateSchedule();
  });

  document.getElementById('departure-time').addEventListener('change', calculateSchedule);
  
  document.getElementById('reset-btn').addEventListener('click', () => {
    resetProgress();
    calculateSchedule();
  });
});

function resetProgress() {
  taskStates = {};
  startTime = null;
  localStorage.removeItem('morning_states');
  localStorage.removeItem('morning_start_time');
}

function startMorning() {
  const depTimeStr = document.getElementById('departure-time').value;
  const now = new Date();
  const today = new Date();
  const [depH, depM] = depTimeStr.split(':').map(Number);
  let depDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), depH, depM, 0);

  // スタートを押した時点で出発時刻を過ぎている場合
  if (now >= depDate) {
    alert('⚠️ 目標出発時刻を過ぎています！\n設定欄で目標出発時刻を再設定してください。');
    return;
  }

  startTime = now.toISOString();
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

  const startBoxHtml = `
    <div style="margin-bottom: 15px; text-align: center;">
      ${startTime ? 
        `<div style="font-size:0.9rem; color:#2ECC71; font-weight:bold;">🚀 準備スタート完了 (${formatTime(new Date(startTime))})</div>` : 
        `<button onclick="startMorning()" class="btn btn-primary" style="background:#2ECC71;">🚀 今から準備スタート！</button>`
      }
    </div>
  `;

  let currentPointTime = startTime ? new Date(startTime) : new Date(initialStartDate.getTime());
  let lastActionTime = new Date(currentPointTime.getTime());

  selectedTasks.forEach((task, index) => {
    const state = taskStates[task.id] || { done: false, completedAt: null };
    
    // --- 【圧縮計算ロジック】 ---
    // これ以降に残っている未完了タスクの元の設定時間の合計を算出
    const remainingTasks = selectedTasks.slice(index).filter(t => !taskStates[t.id]?.done);
    const remainingOrigTotal = remainingTasks.reduce((sum, t) => sum + t.duration, 0);

    // 現在地点から出発時間までの残り時間（ミリ秒）
    const remainingTimeMs = depDate.getTime() - currentPointTime.getTime();

    let targetEndTime;
    let isCompressed = false;

    if (!state.done && remainingOrigTotal > 0 && remainingTimeMs < remainingOrigTotal * 60000) {
      // 予定通りだと間に合わない場合：残り時間を出発時間に合わせて比率で縮小（圧縮）
      if (remainingTimeMs > 0) {
        const compressedDurationMs = (task.duration / remainingOrigTotal) * remainingTimeMs;
        targetEndTime = new Date(currentPointTime.getTime() + compressedDurationMs);
        isCompressed = true;
      } else {
        // すでに出発時刻を超過している場合
        targetEndTime = new Date(depDate.getTime());
      }
    } else {
      // 通常通りの所要時間計算
      targetEndTime = new Date(currentPointTime.getTime() + task.duration * 60000);
    }

    const li = document.createElement('li');
    li.className = `task-item ${state.done ? 'completed' : ''}`;

    let timeDisplayHtml = '';
    
    if (state.done && state.completedAt) {
      const actualDate = new Date(state.completedAt);
      const diffMs = actualDate.getTime() - lastActionTime.getTime();
      const actualDuration = Math.max(0, Math.round(diffMs / 60000));
      
      const isDelayed = actualDate > targetEndTime;
      const colorStyle = isDelayed ? 'color: #E74C3C; font-weight: bold;' : 'color: #2ECC71; font-weight: bold;';
      
      timeDisplayHtml = `
        <div class="task-time">目標: ${formatTime(targetEndTime)} まで</div>
        <div style="${colorStyle} font-size: 0.85rem;">
          完了: ${formatTime(actualDate)} <span style="background:#EAEAEA; padding:2px 6px; border-radius:4px; margin-left:4px;">[所要時間: ${actualDuration}分]</span> ${isDelayed ? '⚠️遅延' : ''}
        </div>
      `;
      
      lastActionTime = actualDate;
      currentPointTime = actualDate;
    } else {
      const isOverdue = now > targetEndTime;
      const timeStyle = isOverdue ? 'color: #E74C3C; font-weight: bold;' : (isCompressed ? 'color: #E67E22; font-weight: bold;' : 'color: #666;');
      
      timeDisplayHtml = `
        <div class="task-time" style="${timeStyle}">
          目標: <strong>${formatTime(targetEndTime)}</strong> まで ${isCompressed ? '⚡(短縮計算)' : ''} ${isOverdue ? '⚠️遅延中' : ''}
        </div>
      `;
      
      currentPointTime = targetEndTime;
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

  listEl.insertAdjacentHTML('afterbegin', startBoxHtml);
}

function toggleTask(taskId) {
  const selectedTasks = masterTasks.filter(t => t.selected && t.name !== '');
  const targetIndex = selectedTasks.findIndex(t => t.id === taskId);
  const nowIso = new Date().toISOString();

  if (targetIndex !== -1) {
    const isCurrentlyDone = taskStates[taskId]?.done;

    if (!isCurrentlyDone) {
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
}

