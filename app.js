const defaultMasterTasks = [
  { id: 1, name: '朝食', duration: 30, selected: true },
  { id: 2, name: 'お弁当', duration: 60, selected: true },
  { id: 3, name: '歯磨き', duration: 15, selected: true },
  { id: 4, name: 'シャワー', duration: 20, selected: true },
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

  // 1分ごとに画面を更新（リアルタイム遅延判定・再計算）
  setInterval(calculateSchedule, 60000);

  // タスク追加ボタン
  document.getElementById('add-task-btn').addEventListener('click', () => {
    saveTaskInputs();
    masterTasks.push({ id: Date.now(), name: '', duration: 10, selected: true });
    renderTaskInputs();
  });

  // 一括削除ボタン
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

  // 「今日のスケジュール作成」ボタン
  document.getElementById('calculate-btn').addEventListener('click', () => {
    saveTaskInputs();
    calculateSchedule();
  });

  document.getElementById('departure-time').addEventListener('change', calculateSchedule);
  
  // 進捗リセットボタン
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('今日の進捗と記録をリセットしますか？')) {
      resetProgress();
      calculateSchedule();
    }
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

  // 準備スタート時点で出発時刻を過ぎている場合
  if (now >= depDate) {
    alert('⚠️ 目標出発時刻を過ぎています！\n設定欄で新しい目標出発時刻を再設定してください。');
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
  calculateSchedule();
}

function moveDown(index) {
  if (index >= masterTasks.length - 1) return;
  saveTaskInputs();
  const temp = masterTasks[index];
  masterTasks[index] = masterTasks[index + 1];
  masterTasks[index + 1] = temp;
  renderTaskInputs();
  calculateSchedule();
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
  calculateSchedule();
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

  // 初期必要時間の計算（設定通りの合計分）
  let totalMinutes = selectedTasks.reduce((sum, t) => sum + t.duration, 0);
  let initialStartDate = new Date(depDate.getTime() - totalMinutes * 60000);
  
  document.getElementById('calc-start-time').textContent = formatTime(initialStartDate);

  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '';

  // 現在時刻が出発時刻を超過している場合のアラート
  let alertHtml = '';
  if (now >= depDate) {
    alertHtml = `
      <div style="background: #FDEDEC; border: 1px solid #E74C3C; color: #C0392B; padding: 10px; border-radius: 6px; margin-bottom: 12px; font-size: 0.85rem; text-align: center; font-weight: bold;">
        ⚠️ 目標出発時刻 (${depTimeStr}) を過ぎています！<br>設定欄で新しい目標出発時刻を再設定してください。
      </div>
    `;
  }

  const startBoxHtml = `
    <div style="margin-bottom: 15px; text-align: center;">
      ${startTime ? 
        `<div style="font-size:0.9rem; color:#2ECC71; font-weight:bold;">🚀 準備スタート完了 (${formatTime(new Date(startTime))})</div>` : 
        `<button onclick="startMorning()" class="btn btn-primary" style="background:#2ECC71;">🚀 今から準備スタート！</button>`
      }
    </div>
  `;

  // 1. 完了済みタスクの完了順（completedAt順）を取得し、所要時間を動的算出
  const completedList = selectedTasks
    .filter(t => taskStates[t.id]?.done && taskStates[t.id]?.completedAt)
    .sort((a, b) => new Date(taskStates[a.id].completedAt) - new Date(taskStates[b.id].completedAt));

  let basePointTime = startTime ? new Date(startTime) : new Date(initialStartDate.getTime());
  
  // 完了済みタスクごとの実績所要時間マッピング
  const actualDurations = {};
  let prevTime = new Date(basePointTime.getTime());

  completedList.forEach((task) => {
    const compTime = new Date(taskStates[task.id].completedAt);
    const diffMs = compTime.getTime() - prevTime.getTime();
    actualDurations[task.id] = Math.max(0, Math.round(diffMs / 60000));
    prevTime = compTime;
  });

  // 未完了タスクの短縮計算用ベース情報
  const uncompletedStartPoint = completedList.length > 0 
    ? new Date(taskStates[completedList[completedList.length - 1].id].completedAt)
    : new Date(basePointTime.getTime());

  const uncompletedTasks = selectedTasks.filter(t => !taskStates[t.id]?.done);
  const uncompletedOrigTotalMin = uncompletedTasks.reduce((sum, t) => sum + t.duration, 0);

  // 未完了タスク全体に割り当て可能な残り時間（ミリ秒）
  const availableRemainingMs = depDate.getTime() - uncompletedStartPoint.getTime();

  // 未完了タスク一括で「短縮が必要か」を判定
  const needsCompression = uncompletedOrigTotalMin > 0 && availableRemainingMs < uncompletedOrigTotalMin * 60000;

  // スケジュール描画用の時刻ポインタ
  let schedPointer = new Date(basePointTime.getTime());
  let currentUncompletedPoint = new Date(uncompletedStartPoint.getTime());

  selectedTasks.forEach((task) => {
    const state = taskStates[task.id] || { done: false, completedAt: null };
    const li = document.createElement('li');
    li.className = `task-item ${state.done ? 'completed' : ''}`;

    let timeDisplayHtml = '';

    if (state.done && state.completedAt) {
      // --- 【完了済みタスクの表示】 ---
      const actualDate = new Date(state.completedAt);
      const actualDuration = actualDurations[task.id] ?? 0;
      
      let targetEndTime = new Date(schedPointer.getTime() + task.duration * 60000);
      const isDelayed = actualDate > targetEndTime;
      const colorStyle = isDelayed ? 'color: #E74C3C; font-weight: bold;' : 'color: #2ECC71; font-weight: bold;';

      timeDisplayHtml = `
        <div class="task-time">目標: ${formatTime(targetEndTime)} まで</div>
        <div style="${colorStyle} font-size: 0.85rem; margin-top: 2px;">
          完了: ${formatTime(actualDate)} <span style="background:#EAEAEA; padding:2px 6px; border-radius:4px; margin-left:4px;">[所要時間: ${actualDuration}分]</span> ${isDelayed ? '⚠️遅延' : ''}
        </div>
      `;

      schedPointer = actualDate;
    } else {
      // --- 【未完了タスクの表示】 ---
      let targetEndTime;
      let isCompressed = false;

      if (needsCompression) {
        if (availableRemainingMs > 0) {
          // 残り時間を各タスクの設定時間の比率で配分
          const allocatedMs = (task.duration / uncompletedOrigTotalMin) * availableRemainingMs;
          targetEndTime = new Date(currentUncompletedPoint.getTime() + allocatedMs);
          isCompressed = true;
        } else {
          // すでに出発時刻を越えている場合は出発時刻に固定
          targetEndTime = new Date(depDate.getTime());
          isCompressed = true;
        }
      } else {
        targetEndTime = new Date(currentUncompletedPoint.getTime() + task.duration * 60000);
      }

      const isOverdue = now > targetEndTime;
      const timeStyle = isOverdue ? 'color: #E74C3C; font-weight: bold;' : (isCompressed ? 'color: #E67E22; font-weight: bold;' : 'color: #666;');

      timeDisplayHtml = `
        <div class="task-time" style="${timeStyle} margin-top: 2px;">
          目標: <strong>${formatTime(targetEndTime)}</strong> まで ${isCompressed ? '⚡(短縮計算)' : ''} ${isOverdue ? '⚠️遅延中' : ''}
        </div>
      `;

      currentUncompletedPoint = new Date(targetEndTime.getTime());
      schedPointer = new Date(targetEndTime.getTime());
    }

    // チェックボックスとタスク名を同一行に配置
    li.innerHTML = `
      <div class="task-info" style="width: 100%;">
        <label style="display: flex; align-items: center; cursor: pointer; font-weight: bold; font-size: 1rem;">
          <input type="checkbox" class="task-checkbox" style="width: 20px; height: 20px; margin-right: 8px;" ${state.done ? 'checked' : ''} onchange="toggleTask(${task.id})">
          <span>${task.name} <span style="font-weight: normal; font-size: 0.85rem; color: #666;">(${task.duration}分設定)</span></span>
        </label>
        <div style="margin-left: 28px;">
          ${timeDisplayHtml}
        </div>
      </div>
    `;

    listEl.appendChild(li);
  });

  listEl.insertAdjacentHTML('afterbegin', startBoxHtml + alertHtml);
}

// 押した単一タスクのみトグル切り替え（順不同対応）
function toggleTask(taskId) {
  const nowIso = new Date().toISOString();

  if (!startTime) {
    startTime = nowIso;
    localStorage.setItem('morning_start_time', startTime);
  }

  const isCurrentlyDone = taskStates[taskId]?.done;

  if (!isCurrentlyDone) {
    taskStates[taskId] = { done: true, completedAt: nowIso };
  } else {
    taskStates[taskId] = { done: false, completedAt: null };
  }

  localStorage.setItem('morning_states', JSON.stringify(taskStates));
  calculateSchedule();
}

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
