const fileInput = document.getElementById('imageInput');
const dropzone = document.getElementById('dropzone');
const fileList = document.getElementById('fileList');
const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const langSelect = document.getElementById('langSelect');
const previewToggle = document.getElementById('previewToggle');
const processBtn = document.getElementById('processBtn');
const wordBtn = document.getElementById('wordBtn');
const excelBtn = document.getElementById('excelBtn');
const clearBtn = document.getElementById('clearBtn');
const copyAllBtn = document.getElementById('copyAll');

let queue = [];
let idCounter = 0;

const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp', 'image/tiff'];

function formatBytes(bytes = 0) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function updateStatus(text) {
    statusEl.textContent = text;
}

function addFiles(fileListLike) {
    const files = Array.from(fileListLike || []);
    const validFiles = files.filter(file => allowedTypes.includes(file.type));

    const newItems = validFiles.map(file => ({
        id: `f-${Date.now()}-${idCounter++}`,
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
        text: '',
        error: ''
    }));

    if (newItems.length === 0) {
        updateStatus('Desteklenen bir görsel seçin.');
        return;
    }

    queue = queue.concat(newItems);
    renderQueue();
    updateStatus(`${queue.length} dosya listede.`);
}

function renderQueue() {
    fileList.innerHTML = '';
    queue.forEach(item => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.dataset.id = item.id;

        if (previewToggle.checked) {
            const img = document.createElement('img');
            img.className = 'preview';
            img.src = URL.createObjectURL(item.file);
            img.alt = item.name;
            card.appendChild(img);
        }

        const meta = document.createElement('div');
        meta.className = 'file-meta';
        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = item.name;
        const size = document.createElement('div');
        size.className = 'file-size';
        size.textContent = formatBytes(item.size);
        meta.appendChild(name);
        meta.appendChild(size);
        card.appendChild(meta);

        const badge = document.createElement('div');
        badge.className = `badge ${item.status}`;
        badge.textContent = item.status === 'pending' ? 'Beklemede' : item.status === 'working' ? 'İşleniyor' : item.status === 'done' ? 'Hazır' : 'Hata';
        card.appendChild(badge);

        const progress = document.createElement('div');
        progress.className = 'progress';
        const bar = document.createElement('span');
        bar.style.width = `${item.progress || 0}%`;
        progress.appendChild(bar);
        card.appendChild(progress);

        if (item.error) {
            const err = document.createElement('div');
            err.style.color = '#ef858f';
            err.style.fontSize = '12px';
            err.textContent = item.error;
            card.appendChild(err);
        }

        fileList.appendChild(card);
    });
}

function mergeOutput() {
    const ready = queue.filter(q => q.text);
    if (!ready.length) {
        output.value = '';
        return;
    }
    const blocks = ready.map(item => `# ${item.name}\n${item.text.trim()}`);
    output.value = blocks.join('\n\n---\n\n');
}

async function processItem(item, lang) {
    item.status = 'working';
    item.progress = 5;
    renderQueue();

    try {
        const result = await Tesseract.recognize(item.file, lang, {
            logger: message => {
                if (message.status === 'recognizing text' && typeof message.progress === 'number') {
                    item.progress = Math.round(message.progress * 100);
                    updateProgressBar(item.id, item.progress);
                }
            }
        });

        item.text = (result.data.text || '').trim();
        item.status = 'done';
        item.progress = 100;
        updateProgressBar(item.id, 100);
    } catch (error) {
        console.error(error);
        item.status = 'error';
        item.error = 'OCR başarısız: ' + (error.message || error);
    }

    renderQueue();
    mergeOutput();
}

function updateProgressBar(id, value) {
    const card = fileList.querySelector(`[data-id="${id}"]`);
    if (!card) return;
    const bar = card.querySelector('.progress span');
    if (bar) {
        bar.style.width = `${value}%`;
    }
}

async function processAll() {
    if (queue.length === 0) {
        updateStatus('Önce görsel ekleyin.');
        return;
    }

    const lang = langSelect.value || 'eng';
    updateStatus('OCR başlatıldı...');

    let done = 0;
    for (const item of queue) {
        if (item.status === 'done') {
            done++;
            continue;
        }
        await processItem(item, lang);
        done++;
        updateStatus(`${done}/${queue.length} tamamlandı`);
    }

    updateStatus('Tüm işlemler bitti.');
}

function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportWord() {
    const items = queue.filter(q => q.text);
    if (items.length === 0) {
        updateStatus('Word için çıkarılmış metin yok.');
        return;
    }

    const doc = new docx.Document({
        sections: [
            {
                children: items.flatMap(item => [
                    new docx.Paragraph({ text: item.name, heading: docx.HeadingLevel.HEADING_2 }),
                    new docx.Paragraph({ text: item.text || '' }),
                    new docx.Paragraph({ text: '' })
                ])
            }
        ]
    });

    docx.Packer.toBlob(doc).then(blob => downloadBlob('image-text-output.docx', blob));
}

function exportExcel() {
    const items = queue.filter(q => q.text);
    if (items.length === 0) {
        updateStatus('Excel için çıkarılmış metin yok.');
        return;
    }

    const data = [['Dosya Adı', 'Metin']];
    items.forEach(item => data.push([item.name, item.text]));

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extracted');
    XLSX.writeFile(wb, 'image-text-output.xlsx');
}

function clearAll() {
    queue = [];
    fileList.innerHTML = '';
    output.value = '';
    updateStatus('Temizlendi.');
}

function copyAll() {
    if (!output.value.trim()) {
        updateStatus('Kopyalanacak metin yok.');
        return;
    }
    navigator.clipboard.writeText(output.value)
        .then(() => updateStatus('Metin panoya kopyalandı.'))
        .catch(() => updateStatus('Kopyalama başarısız.'));
}

// Event wiring
fileInput.addEventListener('change', e => addFiles(e.target.files));
processBtn.addEventListener('click', processAll);
wordBtn.addEventListener('click', exportWord);
excelBtn.addEventListener('click', exportExcel);
clearBtn.addEventListener('click', clearAll);
copyAllBtn.addEventListener('click', copyAll);
previewToggle.addEventListener('change', renderQueue);

dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
});

window.addEventListener('paste', e => {
    if (e.clipboardData && e.clipboardData.files.length) {
        addFiles(e.clipboardData.files);
    }
});

updateStatus('Hazır. Görsel ekleyin.');
