// --- Google API 憑證與日曆設定 ---
// !!! 請務必填入您自己的資訊 !!!
const CLIENT_ID = '1075306531168-98n8t41enlhjr1dclgksfq70jlua0ri6.apps.googleusercontent.com'; // <-- 從 Google Cloud Console 複製的用戶端 ID
const API_KEY = 'AIzaSyAl95jvkYajw9BXdnd5iaEIMKzQqssmvp4'; // <-- 我們稍後會設定這個
const CALENDAR_ID = 'c_69efc270b128b7dfdf3b55d7ab503a7597360eb4a45b35cd4bb655b55ea67c55@group.calendar.google.com'; // <-- 您會議室日曆的 ID (email格式)
// !!! 請務必填入您自己的資訊 !!!

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let gapiInited = false;
let gisInited = false;

const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const bookingForm = document.getElementById('booking-form');
const calendarEmbedContainer = document.getElementById('calendar-embed');

// --- 程式主要入口 ---

// Google GAPI 程式庫載入完成時會呼叫此函式
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

// Google GSI (登入) 程式庫載入完成時會呼叫此函式
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // 等一下會動態填入回呼函式
    });
    gisInited = true;
    maybeEnableButtons();
}

// 初始化 GAPI Client
async function initializeGapiClient() {
    // API Key 的部分是為了讓「未登入」的使用者也能「讀取」公開日曆
    // 您需要在 Google Cloud Console 的「憑證」頁面建立一個「API 金鑰」並貼在上方
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

// 檢查是否兩個 Google 程式庫都載入完成
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        authorizeButton.style.display = 'block';
        loadCalendarEmbed(); // 載入嵌入的日曆
    }
}

// --- 功能函式 ---

// 載入嵌入的日曆
function loadCalendarEmbed() {
    const calendarSrc = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(CALENDAR_ID)}&ctz=Asia/Taipei`;
    calendarEmbedContainer.innerHTML = `<iframe src="${calendarSrc}" style="border: 0" width="800" height="600" frameborder="0" scrolling="no"></iframe>`;
}

// 處理授權按鈕點擊
authorizeButton.onclick = function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        signoutButton.style.display = 'block';
        authorizeButton.style.display = 'none';
        bookingForm.style.display = 'block'; // 顯示預約表單
        // 您可以在這裡加入讀取即將到來事件的程式碼
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

// 處理登出按鈕點擊
signoutButton.onclick = function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
        bookingForm.style.display = 'none'; // 隱藏預約表單
    }
}

// 處理表單提交 (★★★ 全新版本，整合了兩大新功能 ★★★)
bookingForm.onsubmit = async function(e) {
    e.preventDefault(); // 防止頁面重新整理

    // 1. 取得表單所有資料
    const summary = document.getElementById('summary').value;
    const bookingDate = document.getElementById('booking-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value; // 新增：取得結束時間

    if (!summary || !bookingDate || !startTime || !endTime) {
        alert("請填寫所有欄位！");
        return;
    }

    // 2. 組合日期時間物件並驗證
    const startDateTime = new Date(`${bookingDate}T${startTime}`);
    const endDateTime = new Date(`${bookingDate}T${endTime}`); // 新增：使用選擇的結束時間

    // 新增：驗證結束時間是否晚於開始時間
    if (endDateTime <= startDateTime) {
        alert('預約失敗！結束時間必須晚於開始時間。');
        return;
    }

    try {
        // 3. ★★★【新功能】檢查時間衝突 ★★★
        console.log('正在檢查時間是否已被預約...');
        const conflictCheckResponse = await gapi.client.calendar.events.list({
            'calendarId': CALENDAR_ID,
            'timeMin': startDateTime.toISOString(),
            'timeMax': endDateTime.toISOString(),
            'maxResults': 1, // 我們只需要知道有沒有事件，所以查1筆就夠了
            'singleEvents': true
        });

        if (conflictCheckResponse.result.items.length > 0) {
            // 如果 items 陣列長度大於 0，表示該時段內有事件存在
            alert('預約失敗！該時段已被預約，請選擇其他時間。');
            console.error('預約衝突', conflictCheckResponse.result.items);
            return; // 中斷預約
        }

        // 4. 如果沒有衝突，則建立新活動
        console.log('時間允許，正在建立新預約...');
        const event = {
            'summary': summary,
            'start': {
                'dateTime': startDateTime.toISOString(),
                'timeZone': 'Asia/Taipei'
            },
            'end': {
                'dateTime': endDateTime.toISOString(),
                'timeZone': 'Asia/Taipei'
            }
        };

        const request = gapi.client.calendar.events.insert({
            'calendarId': CALENDAR_ID,
            'resource': event
        });
        
        await request.execute(function(event) {
            console.log('--- Google API 回傳的成功資料 ---');
            console.log(event);

            alert(`預約成功！\n事由：${event.summary}\n時間：${new Date(event.start.dateTime).toLocaleString()} - ${new Date(event.end.dateTime).toLocaleTimeString()}`);
            bookingForm.reset();
            
            // 自動重整 iframe 
            const calendarIframe = document.querySelector('#calendar-embed iframe');
            if (calendarIframe) {
                calendarIframe.src = calendarIframe.src; 
            }
        });

    } catch (error) {
        console.error('預約過程中發生錯誤:', error);
        alert('預約過程中發生錯誤，請查看主控台 (Console) 的詳細資訊。');
    }
};

// 動態產生時間選項 (00:00, 00:30, 01:00...)
function populateTimeSlots(selectElementId) {
    const timeSelect = document.getElementById(selectElementId);
    if (!timeSelect) return; // 如果找不到元素就直接返回

    for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 2; j++) {
            const hour = i.toString().padStart(2, '0');
            const minute = (j * 30).toString().padStart(2, '0');
            const timeValue = `${hour}:${minute}:00`;

            const option = document.createElement('option');
            option.value = timeValue;
            option.textContent = `${hour}:${minute}`;
            timeSelect.appendChild(option);
        }
    }
}


// --- 值日生輪播系統 (與之前相同) ---
const dutyNames = ["邱顯安", "許一文", "陳重年", "黃子嘉", "陳泊翌", "張書豪", "邱冠中", "徐婉真", "黃俊凱", "林依萱"];
const startDate = new Date('2025-07-18T00:00:00');
const rotationDays = 7;
const dutyListContainer = document.getElementById('duty-roster-list');

function displayDutyRoster() {
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
document.addEventListener('DOMContentLoaded', (event) => {
    displayDutyRoster();
    populateTimeSlots('start-time'); // 填入開始時間
    populateTimeSlots('end-time');   // ★ 新增：也填入結束時間
});