// デフォルトのマスタータスク
const defaultMasterTasks = [
  { id: 1, name: '洗顔・歯磨き', duration: 10, selected: true },
  { id: 2, name: '朝食', duration: 20, selected: true },
  { id: 3, name: '着替え・身支度', duration: 15, selected: true },
  { id: 4, name: 'メイク / ひげそり', duration: 15, selected: false },
  { id: 5, name: 'ゴミ出し', duration: 5, selected: false },
  { id: 6, name: '持ち物チェック', duration: 5, selected: true }
];

let masterTasks = JSON.parse(localStorage.getItem('morning_master_tasks')) || defaultMasterTasks;
let taskStates = JSON.parse(localStorage.getItem('morning_states')) || {};

document.addEventListener('DOMContentLoaded', () => {
  renderTaskInputs();
  calculateSchedule();

  // タスク追加ボタン：【修正】追加する前に入力内容を一時保存する
  document.getElementById('add-task-btn').addEventListener('click', () => {
    saveTaskInputs(); // 今画面に入力されている内容を保存
    masterTasks.push({ id: Date.now(), name: '', duration: 10, selected: true });
    renderTaskInputs(); // その後に再描画
  });

  // スケジュール更新ボタン
  document.getElementById('calculate-btn').addEventListener('click', () => {
    saveTaskInputs();
    calculateSchedule();
  });

  document.getElementById('departure-time').addEventListener('change', calculateSchedule);
  
  // 進捗リセット
  document.getElementById('reset-btn').addEventListener('click', () => {
    taskStates = {};
    localStorage.removeItem('morning_states');
    calculateSchedule();
  });
});

// 設定セクションの描画（入力内容が消えないようイベントリスナーも追加）
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

  // 文字を入力したりチェックを変えた瞬間にリアルタイムでデータを保持する処理
  const inputs = container.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', saveTaskInputs);
    input.addEventListener('change', saveTaskInputs);
  });
}

function removeTask(index) {
  saveTaskInputs(); // 削除する前にも現在の入力を保持
  masterTasks.splice(index, 1);
  renderTaskInputs();
  calculateSchedule();
}

// 画面に入力されている内容をデータ（masterTasks）に保存する処理
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

  // ブラウザの文字記憶領域に保存
  localStorage.setItem('morning_master_tasks', JSON.stringify(masterTasks));
}

// 時間計算＆実行用リストの描画
function calculateSchedule() {
  const depTimeStr = document.getElementById('departure-time').value;
  // 今日選択されているタスク（かつ名前が空でないもの）だけを抽出
  const selectedTasks = masterTasks.filter(t => t.selected && t.name.trim() !== '');

  if (!depTimeStr || selectedTasks.length === 0) {
    document.getElementById('calc-start-time').textContent = '--:--';
    document.getElementById('task-list').innerHTML = '<li style="padding:15px; text-align:center; color:#888;">タスクが選択されていないか、名前が空です</li>';
    return;
  }

  const today = new Date();
  const [depH, depM] = depTimeStr.split(':').map(Number);
  let depDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), depH, depM, 0);

  // 1. 選択タスクの合計所要時間から、最初の開始時刻を計算
  let totalMinutes = selectedTasks.reduce((sum, t) => sum + t.duration, 0);
  let initialStartDate = new Date(depDate.getTime() - totalMinutes * 60000);
  
  document.getElementById('calc-start-time').textContent = formatTime(initialStartDate);

  // 2. スケジュール描画 & 完了実績によるリアルタイム再計算
  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '';

  let currentStartTime = new Date(initialStartDate.getTime());

  selectedTasks.forEach((task) => {
    const state = taskStates[task.id] || { done: false, completedAt: null };
    let scheduledEnd = new Date(currentStartTime.getTime() + task.duration * 60000);

    const li = document.createElement('li');
    li.className = `task-item ${state.done ? 'completed' : ''}`;

    let actualTimeString = '';
    if (state.done && state.completedAt) {
      const actualDate = new Date(state.completedAt);
      actualTimeString = `(完了: ${formatTime(actualDate)})`;
      // 実績時刻を次のタスクの開始基準時間にする（再計算）
      currentStartTime = actualDate;
      scheduledEnd = new Date(currentStartTime.getTime() + task.duration * 60000);
    }

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${state.done ? 'checked' : ''} onchange="toggleTask(${task.id})">
      <div class="task-info">
        <div class="task-name">${escapeHtml(task.name)} (${task.duration}分)</div>
        <div class="task-time">予定: ${formatTime(currentStartTime)} ～ ${formatTime(scheduledEnd)}</div>
        ${actualTimeString ? `<div class="actual-time">${actualTimeString}</div>` : ''}
      </div>
    `;

    listEl.appendChild(li);

    if (!state.done) {
      currentStartTime = scheduledEnd;
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

// 特殊文字対策（入力されたテキストの安全な表示用）
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
