// --- 值日生輪播系統 ---

// 1. 設定輪值的基本資料
const dutyNames = [
    "黃俊凱", "林依萱", "邱顯安", "許一文", "陳重年", 
    "黃子嘉", "陳泊翌", "張書豪", "邱冠中", "徐婉真"
];
const startDate = new Date('2025-07-04T00:00:00'); 
const rotationDays = 7; 

// 2. 找到要在哪裡顯示輪值表
const dutyListContainer = document.getElementById('duty-roster-list');

// 3. 主要的計算與顯示函式
function displayDutyRoster() {
    // 確保容器存在
    if (!dutyListContainer) {
        console.error('找不到 ID 為 "duty-roster-list" 的 HTML 元素！');
        return;
    }
    
    dutyListContainer.innerHTML = ''; // 清空舊內容
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 將時間設為午夜，避免因小時、分鐘影響日期比較

    let periodCounter = 0;
    let firstDutyDate = new Date(startDate);

    // 迴圈：不斷將起始日期往後推（每次加7天），直到找到第一個「大於或等於今天」的輪值日
    while (firstDutyDate < today) {
        periodCounter++;
        // 重新從 startDate 計算，避免 누적 誤差
        firstDutyDate = new Date(startDate);
        firstDutyDate.setDate(startDate.getDate() + periodCounter * rotationDays);
    }

    // 從找到的第一個輪值日開始，往後顯示 10 筆資料
    for (let i = 0; i < 10; i++) {
        const currentPeriod = periodCounter + i;
        
        const dutyDate = new Date(startDate);
        dutyDate.setDate(startDate.getDate() + currentPeriod * rotationDays);

        const dateString = `${dutyDate.getMonth() + 1}月${dutyDate.getDate()}日`;

        // 根據總週期數來計算正確的人名索引
        const personIndex = currentPeriod % dutyNames.length;
        const personName = dutyNames[personIndex];

        const dutyEntry = document.createElement('p');
        dutyEntry.textContent = `日期 (${dateString})：${personName}`;
        dutyListContainer.appendChild(dutyEntry);
    }
}

// --- 頁面載入後執行的動作 ---
// 當網頁載入完成後，執行我們的函式
document.addEventListener('DOMContentLoaded', (event) => {
    displayDutyRoster();
});