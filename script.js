// ====== Supabase 設定 ======
const SUPABASE_URL = 'https://yeveuzdezowqijcyyxiv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldmV1emRlem93cWlqY3l5eGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4Njc0NjAsImV4cCI6MjA3NDQ0MzQ2MH0.5Kd9ZNfLR0Hzpnz1H1tBXzvP_CWUD0u00c2UsfD1GfI';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ====== ヘルプモーダルの開閉処理 ======
const helpModal = document.getElementById('help-modal');
const closeHelpModal = document.getElementById('close-modal');

// ヘルプリンクを押したら表示
document.getElementById('help-link').addEventListener('click', (e) => {
    e.preventDefault();
    helpModal.style.display = 'block';
});

// ×ボタンを押したら閉じる
closeHelpModal.addEventListener('click', () => {
    helpModal.style.display = 'none';
});

// モーダルの外側（黒い背景部分）をクリックした時に閉じる処理をまとめる
window.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.style.display = 'none';
    if (e.target === proModal) proModal.style.display = 'none'; // Pro認証モーダルも一緒に外側クリックで閉じるように
});
// ====== UI要素の取得 ======
const editorSections = document.getElementById('editor-sections');
const previewSections = document.getElementById('preview-sections');
const titleInput = document.getElementById('project-title');
const coverInput = document.getElementById('cover-image');
let coverBase64Data = ""; 
const clearCoverBtn = document.getElementById('clear-cover-btn');
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
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        authBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> ログアウト`;
        
        // メタデータからPro判定
        isProUser = currentUser.user_metadata?.is_pro === true;
        
        if (!isProUser) {
            proBtn.style.display = 'inline-flex'; // 未課金ならProボタン表示
        } else {
            proBtn.style.display = 'none'; // 課金済みならProボタンを隠す
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
        // ✨ リダイレクト先を「今開いているURL（余計な文字を省いたもの）」に完全固定！
        await supabaseClient.auth.signInWithOAuth({ 
            provider: 'google',
            options: {
                redirectTo: window.location.href.split('#')[0].split('?')[0]
            }
        });
    }
});

// Proボタン（Stripeへ）
// ====== 👑 Proボタン（BOOTHライセンス認証に変更！） ======
// ====== 👑 BOOTH ライセンスキー認証（モーダル版！） ======
const proModal = document.getElementById('pro-modal');
const closeProModal = document.getElementById('close-pro-modal');
const submitLicenseBtn = document.getElementById('submit-license-btn');
const licenseKeyInput = document.getElementById('license-key-input');

// Proボタンを押したらモーダルを開く
proBtn.addEventListener('click', () => {
    proModal.style.display = 'block';
    licenseKeyInput.value = ''; // 入力欄を空にする
});

// ×ボタンや外側をクリックで閉じる
closeProModal.addEventListener('click', () => proModal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === proModal) proModal.style.display = 'none'; });

// 「認証する」ボタンを押した時の処理
submitLicenseBtn.addEventListener('click', async () => {
    const key = licenseKeyInput.value.trim();
    if (!key) {
        showToast('<i class="fa-solid fa-triangle-exclamation"></i> キーを入力してください！');
        return;
    }

    const originalText = submitLicenseBtn.innerHTML;
    submitLicenseBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 認証中...`;
    submitLicenseBtn.disabled = true;

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-license`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ licenseKey: key, userId: currentUser.id })
        });
        const result = await response.json();

        if (response.ok && result.success) {
            proModal.style.display = 'none'; // モーダルを閉じる
            showToast('<i class="fa-solid fa-crown"></i> Pro機能が有効化されました！✨');
            setTimeout(() => { location.reload(); }, 2000);
        } else {
            showToast(`<i class="fa-solid fa-triangle-exclamation"></i> ${result.error || '認証失敗💦'}`);
        }
    } catch (err) {
        showToast('<i class="fa-solid fa-triangle-exclamation"></i> 通信エラーが発生しました💦');
    } finally {
        submitLicenseBtn.innerHTML = originalText;
        submitLicenseBtn.disabled = false;
    }
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
            imgBase64: sec.querySelector('.img-base64')?.value || '',
            showHeader: sec.querySelector('.header-toggle-check').checked
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
    
    // ✨ ログインしている時【だけ】最新情報にリフレッシュする（無限ループ防止！！）
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        const { data: { session: refreshedSession } } = await supabaseClient.auth.refreshSession();
        if (refreshedSession && refreshedSession.user.user_metadata?.is_pro === true) {
            isProUser = true;
            proBtn.style.display = 'none';
            // トーストが何度も出ないように、Proになった瞬間だけ出すような工夫
            console.log("Pro機能有効確認済み");
        }
    }

    // （以下、共有リンクの読み込み処理）
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
            clearCoverBtn.style.display = 'inline-block'; // ✨画像が入ったら削除ボタンを出す
        };
        reader.readAsDataURL(file);
    }
});
clearCoverBtn.addEventListener('click', () => {
    coverInput.value = ''; // 選択したファイルをリセット
    coverBase64Data = '';
    document.getElementById('preview-cover-img').style.display = 'none';
    document.getElementById('cover-file-name').textContent = '';
    clearCoverBtn.style.display = 'none'; // 削除ボタンを隠す
});

document.getElementById('add-sec-btn').addEventListener('click', () => {
    addSection(document.getElementById('section-type-select').value);
});

// 📌 問題だった「addSection」の完全版！
function addSection(type, data = {}) {
    const id = Date.now().toString() + Math.floor(Math.random()*1000);
    const label = sectionLabels[type];
    
    const titleVal = data.title || '';
    const metaVal = data.meta || '';
    const textVal = data.text || '';
    const imgBase64Val = data.imgBase64 || '';
    const showHeaderVal = data.showHeader !== false; // デフォルトは true（表示）

    let html = `<div class="editor-section" data-id="${id}" data-type="${type}">
                    <div class="sec-header">
                        <i class="fa-solid fa-grip-vertical drag-handle"></i>
                        <strong>${label}</strong>
                        <!-- ✨ 見出しのON/OFFスイッチを追加 -->
                        <label style="font-size:0.8rem; margin-left:auto; margin-right:15px; cursor:pointer;">
                            <input type="checkbox" class="header-toggle-check" ${showHeaderVal ? 'checked' : ''}> 見出し表示
                        </label>
                        <button class="delete-btn" onclick="removeSection('${id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>`;
    if (type === 'custom') {
        html += `<input type="text" class="input-title" placeholder="項目の見出し" value="${titleVal}"><textarea class="input-data" rows="4" placeholder="内容を入力...">${textVal}</textarea>`;
    } else if (type === 'character') {
        html += `<input type="text" class="input-title" placeholder="キャラクター名" value="${titleVal}"><input type="text" class="input-meta" placeholder="年齢・性別・職業など" value="${metaVal}">
                 <label class="custom-file-upload"><i class="fa-solid fa-image"></i> 画像を選択<input type="file" class="img-input" accept="image/*"></label>
                 <div class="file-name-display img-name">${imgBase64Val ? '画像設定済み' : ''}</div>
                 <!-- ✨ 画像削除ボタン -->
                 <button type="button" class="clear-img-btn btn-secondary" style="display:${imgBase64Val ? 'inline-block' : 'none'}; padding:3px 8px; font-size:0.8rem; margin-top:5px;"><i class="fa-solid fa-xmark"></i> 画像を削除</button>
                 <input type="hidden" class="img-base64" value="${imgBase64Val}"><textarea class="input-data" rows="3" placeholder="詳細...">${textVal}</textarea>`;
    } else if (type === 'relationship') {
        html += `<input type="text" class="input-title" placeholder="図のタイトル" value="${titleVal}">
                 <label class="custom-file-upload"><i class="fa-solid fa-project-diagram"></i> 関係図を選択<input type="file" class="img-input" accept="image/*"></label>
                 <div class="file-name-display img-name">${imgBase64Val ? '画像設定済み' : ''}</div>
                 <!-- ✨ 画像削除ボタン -->
                 <button type="button" class="clear-img-btn btn-secondary" style="display:${imgBase64Val ? 'inline-block' : 'none'}; padding:3px 8px; font-size:0.8rem; margin-top:5px;"><i class="fa-solid fa-xmark"></i> 画像を削除</button>
                 <input type="hidden" class="img-base64" value="${imgBase64Val}"><textarea class="input-data" rows="3" placeholder="図の補足説明...">${textVal}</textarea>`;
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
    const clearImgBtn = newEl.querySelector('.clear-img-btn'); // ✨追加
    if (imgInput) {
        imgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                newEl.querySelector('.img-name').textContent = file.name;
                const reader = new FileReader();
                reader.onload = (event) => { 
                    newEl.querySelector('.img-base64').value = event.target.result; 
                    clearImgBtn.style.display = 'inline-block'; // ✨ボタンを出す
                    updatePreview(); 
                };
                reader.readAsDataURL(file);
            }
        });
        
        // ✨画像を削除する処理
        clearImgBtn.addEventListener('click', () => {
            imgInput.value = '';
            newEl.querySelector('.img-base64').value = '';
            newEl.querySelector('.img-name').textContent = '';
            clearImgBtn.style.display = 'none';
            updatePreview();
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
        // ✨ 見出しを表示するかどうかの判定
        const showHeader = sec.querySelector('.header-toggle-check').checked;

        let html = `<div class="preview-sec">`;
        
        if (type === 'custom') {
            if (showHeader) html += `<h2>■ ${title || 'カスタム項目'}</h2>`;
            html += `<p>${data}</p>`;
        } else if (type === 'character') {
            const imgBase64 = sec.querySelector('.img-base64')?.value;
            const imgSrc = imgBase64 ? imgBase64 : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            const imgHtml = imgBase64 ? `<img src="${imgSrc}" class="char-img-preview">` : '';
            if (showHeader) html += `<h2>■ キャラクター：${title || '未設定'}</h2>`;
            html += `<div class="char-preview">${imgHtml}<div class="char-info"><h3>${title || '未設定'}</h3><strong>${meta}</strong><p>${data}</p></div></div>`;
        } else if (type === 'relationship') {
            const imgBase64 = sec.querySelector('.img-base64')?.value;
            const imgHtml = imgBase64 ? `<img src="${imgBase64}" class="rel-img-preview">` : '';
            if (showHeader) html += `<h2>■ ${title || '相関図・関係図'}</h2>`;
            html += `${imgHtml}<p>${data}</p>`;
        } else if (type === 'term' || type === 'history') {
            if (showHeader) html += `<h2>■ ${label}：${title || '未設定'}</h2>`;
            html += `<div class="term-grid"><strong>${type === 'term' ? '分類/読' : '関連情報'}</strong><div>${meta}</div><strong>解説</strong><div>${data}</div></div>`;
        } else {
            if (showHeader) html += `<h2>■ ${label}</h2>`;
            html += `<p>${data}</p>`;
        }
        html += `</div>`;
        previewSections.insertAdjacentHTML('beforeend', html);
    });
}

// ====== PDF出力 ======
const templateSelect = document.getElementById('template-select');
const pdfContent = document.getElementById('pdf-content');

templateSelect.addEventListener('change', (e) => {
    // ユーザーがProじゃないのにテンプレを変えようとしたら弾く！
    if (!isProUser && e.target.value !== 'default') {
        showToast('<i class="fa-solid fa-crown"></i> このテンプレートはPro版限定の機能です！');
        e.target.value = 'default'; // 選択をシンプルに戻す
        return;
    }
    
    // プレビューのクラスを入れ替えてデザインを変更
    pdfContent.className = 'document';
    if (e.target.value !== 'default') {
        pdfContent.classList.add(`template-${e.target.value}`);
    }
});


// ====== PDF出力（👑 目次・ページ番号・テンプレ対応） ======
document.getElementById('export-pdf').addEventListener('click', () => {
    // 👑 ユーザーが設定した「目次をつけるか」のチェックを確認！
    const isTocEnabled = document.getElementById('toc-toggle').checked;
    
    let tocElement = document.getElementById('pdf-toc');
    // 古い目次があれば一旦消す
    if (tocElement) tocElement.remove();

    if (isProUser && isTocEnabled) {
        tocElement = document.createElement('div');
        tocElement.id = 'pdf-toc';
        tocElement.className = 'toc-container preview-sec';
        
        let tocHtml = `<h2>■ 目次 (INDEX)</h2><ul class="toc-list">`;
        pdfContent.querySelectorAll('.preview-sec h2').forEach(sec => {
            if (!sec.innerText.includes('目次')) {
                tocHtml += `<li>${sec.innerText.replace('■ ', '')}</li>`;
            }
        });
        tocHtml += `</ul>`;
        tocElement.innerHTML = tocHtml;
        document.getElementById('preview-cover').after(tocElement);
    }

    const imageQuality = isProUser ? 1.0 : 0.8;
    const canvasScale = isProUser ? 3 : 1.5; 

    if (!isProUser) showToast('<i class="fa-solid fa-circle-info"></i> 無料版のため透かしが入ります');
    else showToast('<i class="fa-solid fa-crown"></i> PDFを生成中...');

    // ✨ pagebreak: { mode: 'avoid-all' } を追加して見切れを防止！
    const opt = {
        margin: 15, 
        filename: `${titleInput.value || '設定資料集'}.pdf`,
        image: { type: 'jpeg', quality: imageQuality },
        html2canvas: { scale: canvasScale, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'avoid-all'] } // これが画像分割を防ぐ魔法！
    };

    html2pdf().set(opt).from(pdfContent).toPdf().get('pdf').then(function(pdf) {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(10);
            
            if (isProUser) {
                pdf.setTextColor(120, 120, 120);
                pdf.text(`- ${i} -`, 105, 287, { align: 'center' });
            } else {
                pdf.setTextColor(150, 150, 150);
                pdf.text('Created by lore-book-maker (Free Version)', 115, 287);
            }
        }
    }).save();
});

// ====== JSON保存＆読込 ======
document.getElementById('save-json').addEventListener('click', () => {
    const sectionsData = Array.from(document.querySelectorAll('.editor-section')).map(sec => {
        return {
            type: sec.dataset.type, title: sec.querySelector('.input-title')?.value || '',
            meta: sec.querySelector('.input-meta')?.value || '', text: sec.querySelector('.input-data')?.value || '',
            imgBase64: sec.querySelector('.img-base64')?.value || '',
            showHeader: sec.querySelector('.header-toggle-check').checked
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
