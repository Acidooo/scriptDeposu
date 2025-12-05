document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const processBtn = document.getElementById('processBtn');
    const languageSelect = document.getElementById('languageSelect');
    const progressContainer = document.getElementById('progressContainer');
    const progressBarFill = document.getElementById('progressBarFill');
    const statusText = document.getElementById('statusText');
    const resultsSection = document.getElementById('resultsSection');
    const previewContainer = document.getElementById('previewContainer');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportWordBtn = document.getElementById('exportWordBtn');

    let selectedFiles = [];
    let extractedData = []; // Stores objects { filename, text, imageSrc }

    // Handle File Selection
    imageInput.addEventListener('change', (e) => {
        selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            processBtn.disabled = false;
            statusText.textContent = `${selectedFiles.length} dosya seçildi.`;
            progressContainer.classList.remove('hidden');
            progressBarFill.style.width = '0%';
        } else {
            processBtn.disabled = true;
            progressContainer.classList.add('hidden');
        }
    });

    // Process Images
    processBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        // Reset UI
        processBtn.disabled = true;
        extractedData = [];
        previewContainer.innerHTML = '';
        resultsSection.classList.add('hidden');
        progressContainer.classList.remove('hidden');
        
        const lang = languageSelect.value;

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const progress = ((i) / selectedFiles.length) * 100;
                updateProgress(progress, `İşleniyor: ${file.name} (${i + 1}/${selectedFiles.length})`);

                const text = await performOCR(file, lang);
                const imageSrc = await readFileAsDataURL(file);

                const resultItem = {
                    filename: file.name,
                    text: text,
                    imageSrc: imageSrc
                };
                extractedData.push(resultItem);
                
                // Add to preview immediately
                addResultToPreview(resultItem, i);
            }

            updateProgress(100, 'İşlem Tamamlandı!');
            resultsSection.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            statusText.textContent = 'Hata oluştu: ' + error.message;
        } finally {
            processBtn.disabled = false;
        }
    });

    // OCR Function using Tesseract.js
    async function performOCR(file, lang) {
        const worker = await Tesseract.createWorker(lang);
        const ret = await worker.recognize(file);
        await worker.terminate();
        return ret.data.text;
    }

    // Helper to read file for preview
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function updateProgress(percent, text) {
        progressBarFill.style.width = `${percent}%`;
        statusText.textContent = text;
    }

    function addResultToPreview(data, index) {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
            <div class="image-preview">
                <img src="${data.imageSrc}" alt="${data.filename}">
                <p><small>${data.filename}</small></p>
            </div>
            <div class="text-content">
                <textarea id="text-${index}">${data.text}</textarea>
            </div>
        `;
        previewContainer.appendChild(div);
        
        // Update data when textarea changes
        const textarea = div.querySelector(`#text-${index}`);
        textarea.addEventListener('input', (e) => {
            extractedData[index].text = e.target.value;
        });
    }

    // Export to Excel
    exportExcelBtn.addEventListener('click', () => {
        if (extractedData.length === 0) return;

        const wb = XLSX.utils.book_new();
        
        // Prepare data for Excel
        const wsData = [
            ['Dosya Adı', 'Çıkarılan Metin'] // Header
        ];

        extractedData.forEach(item => {
            wsData.push([item.filename, item.text]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Set column widths
        ws['!cols'] = [{ wch: 30 }, { wch: 100 }];

        XLSX.utils.book_append_sheet(wb, ws, "OCR Sonuçları");
        XLSX.writeFile(wb, "OCR_Sonuclari.xlsx");
    });

    // Export to Word
    exportWordBtn.addEventListener('click', () => {
        if (extractedData.length === 0) return;

        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

        const children = [];

        // Title
        children.push(
            new Paragraph({
                text: "OCR Çıktısı",
                heading: HeadingLevel.TITLE,
                spacing: { after: 200 }
            })
        );

        extractedData.forEach(item => {
            // File Name Header
            children.push(
                new Paragraph({
                    text: `Dosya: ${item.filename}`,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );

            // Extracted Text (split by newlines to preserve paragraphs)
            const lines = item.text.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    children.push(
                        new Paragraph({
                            text: line.trim(),
                            spacing: { after: 100 }
                        })
                    );
                }
            });
            
            // Separator
            children.push(
                new Paragraph({
                    text: "----------------------------------------",
                    spacing: { before: 200, after: 200 }
                })
            );
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: children,
            }],
        });

        Packer.toBlob(doc).then(blob => {
            saveAs(blob, "OCR_Sonuclari.docx");
        });
    });
});
