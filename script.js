// ====== Supabase 設定 ======
const SUPABASE_URL = 'https://yeveuzdezowqijcyyxiv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldmV1emRlem93cWlqY3l5eGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4Njc0NjAsImV4cCI6MjA3NDQ0MzQ2MH0.5Kd9ZNfLR0Hzpnz1H1tBXzvP_CWUD0u00c2UsfD1GfI';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== UI要素の取得 ======
const editorSections = document.getElementById('editor-sections');
const previewSections = document.getElementById('preview-sections');
const titleInput = document.getElementById('project-title');
const coverInput = document.getElementById('cover-image');
let coverBase64Data = ""; 

const authBtn = document.getElementById('auth-btn');
const proBtn = document.getElementById('pro-upgrade-btn');
let currentUser = null;
let isProUser = false;

// スマホメニュー開閉
document.getElementById('nav-hamburger').addEventListener('click', () => document.getElementById('nav-links').classList.toggle('active'));
document.getElementById('tools-hamburger').addEventListener('click', () => document.getElementById('header-btns').classList.toggle('active'));

// 読込ボタンハック
document.getElementById('load-btn-trigger').addEventListener('click', () => document.getElementById('load-json').click());

// ====== トースト通知 ======
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerHTML = message;
    toast.className = 'toast show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3500);
}

// ====== ログイン状態監視 ======
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        currentUser = session.user;
        authBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> ログアウト`;
        
        // とりあえずログインしたらProボタンを出す（後でDBと連携）
        if (!isProUser) {
            proBtn.style.display = 'inline-flex';
        }
    } else {
        currentUser = null;
        isProUser = false;
        authBtn.innerHTML = `<i class="fa-brands fa-google"></i> ログイン`;
        proBtn.style.display = 'none';
    }
});

authBtn.addEventListener('click', async () => {
    if (currentUser) {
        await supabaseClient.auth.signOut();
        showToast('<i class="fa-solid fa-check"></i> ログアウトしました');
    } else {
        await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    }
});

// Proボタン（Stripeへ）
proBtn.addEventListener('click', () => {
    // StripeのPayment Link URL
    const stripeUrl = `https://buy.stripe.com/test_xxxxxxxxxxx?client_reference_id=${currentUser.id}`;
    window.open(stripeUrl, '_blank');
});

// ====== カラーパレット ======
const colorAccent = document.getElementById('color-accent');
const colorPrimary = document.getElementById('color-primary');
const colorText = document.getElementById('color-text');
const colorBg = document.getElementById('color-bg');
const docRoot = document.getElementById('pdf-content');
const applyColorBtn = document.getElementById('apply-color-btn'); // ボタン取得

function applyColors() {
    // 🔍 F12のコンソール画面にログを出力するデバッグ
    console.log("--- 🎨 カラー反映デバッグ ---");
    console.log("選択された見出し色:", colorAccent.value);
    console.log("選択されたアクセント色:", colorPrimary.value);
    console.log("選択された文字色:", colorText.value);
    console.log("選択された背景色:", colorBg.value);

    // 1. CSS変数にセット
    docRoot.style.setProperty('--doc-accent', colorAccent.value);
    docRoot.style.setProperty('--doc-primary', colorPrimary.value);
    docRoot.style.setProperty('--doc-text', colorText.value);
    docRoot.style.setProperty('--doc-bg', colorBg.value);

    // 2. CSSが効かない時のための「力技（インラインスタイル）」での直接書き換え！
    docRoot.style.backgroundColor = colorBg.value;
    docRoot.style.color = colorText.value;

    const previewTitle = document.getElementById('preview-title');
    if (previewTitle) {
        previewTitle.style.color = colorAccent.value;
    }

    // 既存の見出しも強制的に色を書き換える
    document.querySelectorAll('.preview-sec h2').forEach(h2 => {
        h2.style.color = colorAccent.value;
        h2.style.borderBottomColor = colorAccent.value;
    });

    console.log("🎨 カラー反映処理が完了しました！");
    showToast('<i class="fa-solid fa-palette"></i> 色を反映しました！🎨');
}

// ボタンを押した時に色を反映する！
applyColorBtn.addEventListener('click', applyColors);

const shareBtn = document.getElementById('share-btn');
shareBtn.addEventListener('click', async () => {
    // データを集める
    const sectionsData = Array.from(document.querySelectorAll('.editor-section')).map(sec => {
        return {
            type: sec.dataset.type,
            title: sec.querySelector('.input-title')?.value || '',
            meta: sec.querySelector('.input-meta')?.value || '',
            text: sec.querySelector('.input-data')?.value || '',
            imgBase64: sec.querySelector('.img-base64')?.value || ''
        };
    });

    const saveData = { 
        title: titleInput.value, 
        coverBase64: coverBase64Data,
        colors: { accent: colorAccent.value, primary: colorPrimary.value, text: colorText.value, bg: colorBg.value },
        sections: sectionsData 
    };

    const originalText = shareBtn.innerHTML;
    shareBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 生成中...`;
    shareBtn.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from('shared_books')
            .insert([{ data: saveData }])
            .select();

        if (error) throw error;

        const shareId = data[0].id;
        const shareUrl = `https://mofu-mitsu.github.io/lore-book-maker/?id=${shareId}`;

        await navigator.clipboard.writeText(shareUrl);
        showToast(`<i class="fa-solid fa-link"></i> 共有リンクをコピーしました！`);
    } catch (err) {
        console.error("共有エラー:", err);
        showToast('<i class="fa-solid fa-triangle-exclamation"></i> 共有に失敗しました💦');
    } finally {
        shareBtn.innerHTML = originalText;
        shareBtn.disabled = false;
    }
});
// ====== 共有リンクから飛んできた時の復元処理 ======
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('id');

    if (sharedId) {
        try {
            const { data, error } = await supabaseClient
                .from('shared_books')
                .select('data')
                .eq('id', sharedId)
                .single();

            if (error) throw error;

            if (data && data.data) {
                const sharedData = data.data;

                titleInput.value = sharedData.title || '';
                document.getElementById('preview-title').textContent = sharedData.title || 'プロジェクト名';
                
                if (sharedData.coverBase64) {
                    coverBase64Data = sharedData.coverBase64;
                    const img = document.getElementById('preview-cover-img');
                    img.src = coverBase64Data;
                    img.style.display = 'block';
                    document.getElementById('cover-file-name').textContent = "画像設定済み";
                }

                if (sharedData.colors) {
                    colorAccent.value = sharedData.colors.accent || '#2c3e50';
                    colorPrimary.value = sharedData.colors.primary || '#e67e22';
                    colorText.value = sharedData.colors.text || '#333333';
                    colorBg.value = sharedData.colors.bg || '#ffffff';
                    applyColors();
                }

                editorSections.innerHTML = '';
                if (sharedData.sections && Array.isArray(sharedData.sections)) {
                    sharedData.sections.forEach(secData => {
                        addSection(secData.type, secData);
                    });
                }
                showToast('<i class="fa-solid fa-cloud-arrow-down"></i> 共有データを読み込みました！✨');
            }
        } catch (err) {
            console.error("読み込みエラー:", err);
            showToast('<i class="fa-solid fa-triangle-exclamation"></i> 共有データの読み込みに失敗しました💦');
        }
    }
});

// ====== エディターの基本動作 ======
const sectionLabels = {
    world: '世界概要', geography: '地理・国家', organization: '組織',
    character: 'キャラ情報', relationship: '相関図・関係図', term: '用語集', 
    history: '年表', rule: 'ルール・禁則事項', theme: '作品テーマ', custom: 'カスタム項目'
};

new Sortable(editorSections, { handle: '.drag-handle', animation: 150, onEnd: updatePreview });

titleInput.addEventListener('input', () => { 
    document.getElementById('preview-title').textContent = titleInput.value || 'プロジェクト名'; 
});

coverInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('cover-file-name').textContent = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            coverBase64Data = event.target.result;
            const img = document.getElementById('preview-cover-img');
            img.src = coverBase64Data;
            img.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('add-sec-btn').addEventListener('click', () => {
    addSection(document.getElementById('section-type-select').value);
});

// 📌 問題だった「addSection」の完全版！
function addSection(type, data = {}) {
    const id = Date.now().toString() + Math.floor(Math.random()*1000);
    const label = sectionLabels[type];
    
    // JSON読込用データの処理（未定義エラーを防ぐ）
    const titleVal = data.title || '';
    const metaVal = data.meta || '';
    const textVal = data.text || '';
    const imgBase64Val = data.imgBase64 || '';

    let html = `<div class="editor-section" data-id="${id}" data-type="${type}">
                    <div class="sec-header">
                        <i class="fa-solid fa-grip-vertical drag-handle"></i>
                        <strong>${label}</strong>
                        <button class="delete-btn" onclick="removeSection('${id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>`;

    if (type === 'custom') {
        html += `<input type="text" class="input-title" placeholder="項目の見出し" value="${titleVal}">
                 <textarea class="input-data" rows="4" placeholder="内容を入力...">${textVal}</textarea>`;
    } else if (type === 'character') {
        html += `<input type="text" class="input-title" placeholder="キャラクター名" value="${titleVal}">
                 <input type="text" class="input-meta" placeholder="年齢・性別・職業など" value="${metaVal}">
                 <label class="custom-file-upload"><i class="fa-solid fa-image"></i> 画像を選択<input type="file" class="img-input" accept="image/*"></label>
                 <div class="file-name-display img-name">${imgBase64Val ? '画像設定済み' : ''}</div>
                 <input type="hidden" class="img-base64" value="${imgBase64Val}">
                 <textarea class="input-data" rows="3" placeholder="詳細...">${textVal}</textarea>`;
    } else if (type === 'relationship') {
        html += `<input type="text" class="input-title" placeholder="図のタイトル" value="${titleVal}">
                 <label class="custom-file-upload"><i class="fa-solid fa-project-diagram"></i> 関係図を選択<input type="file" class="img-input" accept="image/*"></label>
                 <div class="file-name-display img-name">${imgBase64Val ? '画像設定済み' : ''}</div>
                 <input type="hidden" class="img-base64" value="${imgBase64Val}">
                 <textarea class="input-data" rows="3" placeholder="図の補足説明...">${textVal}</textarea>`;
    } else if (type === 'term' || type === 'history') {
        html += `<input type="text" class="input-title" placeholder="${type === 'term' ? '用語名' : '年'}" value="${titleVal}">
                 <input type="text" class="input-meta" placeholder="${type === 'term' ? '読み・分類' : '関連勢力など'}" value="${metaVal}">
                 <textarea class="input-data" rows="3" placeholder="詳細を入力...">${textVal}</textarea>`;
    } else {
        html += `<textarea class="input-data" rows="4" placeholder="${label}の詳細...">${textVal}</textarea>`;
    }
    html += `</div>`;
    
    editorSections.insertAdjacentHTML('beforeend', html);
    const newEl = editorSections.lastElementChild;
    newEl.querySelectorAll('input:not([type="file"]), textarea').forEach(el => el.addEventListener('input', updatePreview));

    const imgInput = newEl.querySelector('.img-input');
    if (imgInput) {
        imgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                newEl.querySelector('.img-name').textContent = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    newEl.querySelector('.img-base64').value = event.target.result;
                    updatePreview();
                };
                reader.readAsDataURL(file);
            }
        });
    }
    updatePreview();
}

window.removeSection = function(id) {
    document.querySelector(`.editor-section[data-id="${id}"]`).remove();
    updatePreview();
};

function updatePreview() {
    previewSections.innerHTML = '';
    const sections = document.querySelectorAll('.editor-section');
    
    sections.forEach(sec => {
        const type = sec.dataset.type;
        const title = sec.querySelector('.input-title')?.value || '';
        const meta = sec.querySelector('.input-meta')?.value || '';
        const data = sec.querySelector('.input-data')?.value.replace(/\n/g, '<br>') || '';
        const label = sectionLabels[type];

        let html = `<div class="preview-sec">`;
        
        if (type === 'custom') {
            html += `<h2>■ ${title || 'カスタム項目'}</h2><p>${data}</p>`;
        } else if (type === 'character') {
            const imgBase64 = sec.querySelector('.img-base64')?.value;
            const imgSrc = imgBase64 ? imgBase64 : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            const imgHtml = imgBase64 ? `<img src="${imgSrc}" class="char-img-preview">` : '';
            html += `<h2>■ キャラクター：${title || '未設定'}</h2><div class="char-preview">${imgHtml}<div class="char-info"><h3>${title || '未設定'}</h3><strong>${meta}</strong><p>${data}</p></div></div>`;
        } else if (type === 'relationship') {
            const imgBase64 = sec.querySelector('.img-base64')?.value;
            const imgHtml = imgBase64 ? `<img src="${imgBase64}" class="rel-img-preview">` : '';
            html += `<h2>■ ${title || '相関図・関係図'}</h2>${imgHtml}<p>${data}</p>`;
        } else if (type === 'term' || type === 'history') {
            html += `<h2>■ ${label}：${title || '未設定'}</h2><div class="term-grid"><strong>${type === 'term' ? '分類/読' : '関連情報'}</strong><div>${meta}</div><strong>解説</strong><div>${data}</div></div>`;
        } else {
            html += `<h2>■ ${label}</h2><p>${data}</p>`;
        }
        html += `</div>`;
        previewSections.insertAdjacentHTML('beforeend', html);
    });
}

// ====== PDF出力 ======
document.getElementById('export-pdf').addEventListener('click', () => {
    html2pdf().set({
        margin: 15, filename: `${titleInput.value || '設定資料集'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(document.getElementById('pdf-content')).save();
});

// ====== JSON保存＆読込 ======
document.getElementById('save-json').addEventListener('click', () => {
    const sectionsData = Array.from(document.querySelectorAll('.editor-section')).map(sec => {
        return {
            type: sec.dataset.type, title: sec.querySelector('.input-title')?.value || '',
            meta: sec.querySelector('.input-meta')?.value || '', text: sec.querySelector('.input-data')?.value || '',
            imgBase64: sec.querySelector('.img-base64')?.value || ''
        };
    });
    const saveData = { 
        title: titleInput.value, coverBase64: coverBase64Data,
        colors: { accent: colorAccent.value, primary: colorPrimary.value, text: colorText.value, bg: colorBg.value },
        sections: sectionsData 
    };
    const blob = new Blob([JSON.stringify(saveData)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${titleInput.value || 'backup'}.json`;
    a.click();
});

document.getElementById('load-json').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                titleInput.value = data.title || '';
                document.getElementById('preview-title').textContent = data.title || 'プロジェクト名';
                
                if (data.coverBase64) {
                    coverBase64Data = data.coverBase64;
                    const img = document.getElementById('preview-cover-img');
                    img.src = coverBase64Data; img.style.display = 'block';
                    document.getElementById('cover-file-name').textContent = "画像設定済み";
                }
                if (data.colors) {
                    colorAccent.value = data.colors.accent || '#2c3e50';
                    colorPrimary.value = data.colors.primary || '#e67e22';
                    colorText.value = data.colors.text || '#333333';
                    colorBg.value = data.colors.bg || '#ffffff';
                    applyColors();
                }
                editorSections.innerHTML = '';
                if (data.sections && Array.isArray(data.sections)) {
                    data.sections.forEach(secData => addSection(secData.type, secData));
                }
                showToast('<i class="fa-solid fa-check"></i> データを読み込みました！');
            } catch (err) {
                console.error(err);
                showToast('<i class="fa-solid fa-triangle-exclamation"></i> 読込に失敗しました💦');
            }
        };
        reader.readAsText(file);
    }
});