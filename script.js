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

// 處理表單提交
bookingForm.onsubmit = async function(e) {
    e.preventDefault(); // 防止頁面重新整理

    const summary = document.getElementById('summary').value;
    const bookingDate = document.getElementById('booking-date').value;
    const startTime = document.getElementById('start-time').value;

    if (!summary || !bookingDate || !startTime) {
        alert("請填寫所有欄位！");
        return;
    }

    // 組合日期和時間字串
    const startDateTime = new Date(`${bookingDate}T${startTime}`);
    // 計算 30 分鐘後的結束時間
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    // 建立日曆事件物件
    const event = {
    'summary': summary,
    // 我們暫時將 description 這行移除，讓核心功能恢復正常
    'start': {
        'dateTime': startDateTime.toISOString(),
        'timeZone': 'Asia/Taipei'
    },
    'end': {
        'dateTime': endDateTime.toISOString(),
        'timeZone': 'Asia/Taipei'
    }
};

    try {
        const request = gapi.client.calendar.events.insert({
            'calendarId': CALENDAR_ID,
            'resource': event
        });
        
        await request.execute(function(event) {
            alert(`預約成功！\n事由：${event.summary}\n時間：${new Date(event.start.dateTime).toLocaleString()}`);
            bookingForm.reset();
            // 您可以在這裡重新整理日曆或事件列表 <--- 這行註解可以留著或刪掉，不影響功能
    
            // --- ★ 請在 bookingForm.reset(); 的後面加上這段新程式碼 ★ ---
            const calendarIframe = document.querySelector('#calendar-embed iframe');
            if (calendarIframe) {
                calendarIframe.src = calendarIframe.src; 
    }
    // --- ★ 新增結束 ★ ---
});

    } catch (error) {
        console.error('預約失敗:', error);
        alert('預約失敗，請查看 console 的錯誤訊息。');
    }
};

// 動態產生時間選項 (00:00, 00:30, 01:00...)
function populateTimeSlots() {
    const timeSelect = document.getElementById('start-time');
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
    dutyListContainer.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const dutyDate = new Date(startDate);
        dutyDate.setDate(startDate.getDate() + (i * rotationDays));
        const dateString = `${dutyDate.getMonth() + 1}月${dutyDate.getDate()}日`;
        const personIndex = i % dutyNames.length;
        const personName = dutyNames[personIndex];
        const dutyEntry = document.createElement('p');
        dutyEntry.textContent = `日期 (${dateString})：${personName}`;
        dutyListContainer.appendChild(dutyEntry);
    }
}

// --- 頁面載入後執行的動作 ---
document.addEventListener('DOMContentLoaded', (event) => {
    displayDutyRoster();
    populateTimeSlots();
});