document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const excelFilesInput = document.getElementById('excelFiles');
    const processBtn = document.getElementById('processBtn');
    const statusElement = document.getElementById('status');
    const logElement = document.getElementById('log');
    const downloadContainer = document.getElementById('downloadContainer');
    const downloadLink = document.getElementById('downloadLink');
    
    // Arrays to store extracted data
    let adaIsmiList = [];
    let apartmanAdiList = [];
    let daireNoList = [];
    let aboneNoList = [];
    let mahalList = [];
    let seriNoList = [];
    let tarihList = [];
    let degerList = [];
    let yorumList = [];
    
    // Add event listeners
    processBtn.addEventListener('click', processExcelFiles);
    
    // Main processing function
    function processExcelFiles() {
        const files = excelFilesInput.files;
        if (!files || files.length === 0) {
            updateLog('Lütfen en az bir Excel dosyası seçin.');
            return;
        }
        
        // Clear previous data
        clearData();
        updateStatus(`İşleniyor... (0/${files.length})`);
        
        // Process files sequentially
        let fileIndex = 0;
        processNextFile();
        
        function processNextFile() {
            if (fileIndex >= files.length) {
                updateStatus(`İşlem tamamlandı! ${files.length} dosya işlendi.`);
                generateCombinedExcel();
                return;
            }
            
            // Add separator between file logs
            if (fileIndex > 0) {
                addLogSeparator();
            }
            
            const file = files[fileIndex];
            updateLog(`"${file.name}" dosyası işleniyor (${fileIndex + 1}/${files.length})...`);
            updateStatus(`İşleniyor... (${fileIndex + 1}/${files.length})`);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get the ada name from filename (before the first underscore)
                    const adaIsmi = file.name.split('_')[0];
                    updateLog(`Ada ismi: ${adaIsmi}`);
                    
                    // Find the correct sheet (PÖ or HCA)
                    let sheet = null;
                    let sheetName = null;
                    
                    if (workbook.Sheets['PÖ']) {
                        sheet = workbook.Sheets['PÖ'];
                        sheetName = 'PÖ';
                    } else if (workbook.Sheets['HCA']) {
                        sheet = workbook.Sheets['HCA'];
                        sheetName = 'HCA';
                    } else {
                        throw new Error('PÖ veya HCA sayfası bulunamadı.');
                    }
                    
                    updateLog(`"${sheetName}" sayfası işleniyor...`);
                    
                    // Get raw data as an array of arrays instead of JSON to avoid column reference issues
                    const rawData = XLSX.utils.sheet_to_json(sheet, { 
                        header: 1,  // Use array of arrays format
                        range: 'B6:S1000',  // Skip first column, start from row 6
                        defval: ''  // Default value for empty cells
                    });
                    
                    updateLog(`${rawData.length} satır okunuyor...`);
                    
                    // Log first row to debug column positions
                    if (rawData.length > 0) {
                        updateLog(`İlk satır yapısı: ${JSON.stringify(rawData[0])}`);
                    }
                    
                    // Define column indexes based on the Python script
                    // Since we're starting from column B (index 0 in our array):
                    const apartmanAdiIdx = 0; // Was B column (apartmanAdiColumn)
                    const daireNoIdx = 1;     // Was C column (daireNoColumn)
                    const aboneNoIdx = 3;     // Was E column (aboneNoColumn)
                    const mahalIdx = 5;       // Was G column (mahalColumn)
                    const seriNoIdx = 8;      // Was J column (seriNoColumn)
                    const degerIdx = 15;      // Was Q column (degerColumn)
                    const tarihIdx = 16;      // Was R column (tarihColumn)
                    const yorumIdx = 17;      // Was S column (yorumColumn)
                    
                    // Process each row
                    rawData.forEach(row => {
                        // Skip rows with insufficient data
                        if (!row || row.length < 9) return;
                        
                        // Skip rows with no essential data
                        if (!row[aboneNoIdx] && !row[mahalIdx] && !row[seriNoIdx]) {
                            return;
                        }
                        
                        // Extract values from the row array
                        const apartmanAdi = row[apartmanAdiIdx] || '';
                        const daireNo = row[daireNoIdx] || '';
                        let aboneNo = row[aboneNoIdx] || '';
                        const mahal = row[mahalIdx] || '';
                        const seriNo = row[seriNoIdx] || '';
                        const deger = row[degerIdx] || '';
                        const tarih = row[tarihIdx] || '';
                        const yorum = row[yorumIdx] || '';
                        
                        // Process aboneNo (similar to Python script)
                        if (aboneNo && typeof aboneNo === 'string' && aboneNo.includes('-')) {
                            aboneNo = aboneNo.split('-')[1].trim();
                        }
                        
                        // Add to arrays
                        adaIsmiList.push(adaIsmi);
                        apartmanAdiList.push(apartmanAdi);
                        daireNoList.push(daireNo);
                        aboneNoList.push(aboneNo);
                        mahalList.push(mahal);
                        seriNoList.push(seriNo);
                        degerList.push(deger);
                        tarihList.push(tarih);
                        yorumList.push(yorum);
                    });
                    
                    updateLog(`"${file.name}" dosyası işlendi. ${adaIsmiList.length} toplam satır var.`);
                    
                    // Process next file
                    fileIndex++;
                    processNextFile();
                    
                } catch (error) {
                    updateLog(`"${file.name}" dosyası işlenirken hata: ${error.message}`);
                    fileIndex++;
                    processNextFile();
                }
            };
            
            reader.onerror = function() {
                updateLog(`"${file.name}" dosyası okunurken hata!`);
                fileIndex++;
                processNextFile();
            };
            
            reader.readAsArrayBuffer(file);
        }
    }
    
    // Generate the combined Excel file
    function generateCombinedExcel() {
        try {
            updateLog('Birleştirilmiş Excel dosyası oluşturuluyor...');
            updateLog(`Toplam ${adaIsmiList.length} satır birleştiriliyor.`);
            
            // If no data, show an error
            if (adaIsmiList.length === 0) {
                updateLog('Hiç veri bulunamadı! Lütfen Excel dosyalarını kontrol edin.');
                updateStatus('Hata: Hiç veri bulunamadı!');
                return;
            }
            
            // Create a new workbook
            const wb = XLSX.utils.book_new();
            
            // Create headers
            const headers = [
                'Ada İsmi', 'Apartman Adı', 'Daire No', 'Abone No', 
                'Mahal', 'Seri No', 'Tarih', 'Değer', 'Yorum'
            ];
            
            // Create array of rows
            const data = [headers];
            
            // Add all rows to data
            for (let i = 0; i < adaIsmiList.length; i++) {
                data.push([
                    adaIsmiList[i],
                    apartmanAdiList[i],
                    daireNoList[i],
                    aboneNoList[i],
                    mahalList[i],
                    seriNoList[i],
                    tarihList[i],
                    degerList[i],
                    yorumList[i]
                ]);
            }
            
            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, "Tüm Adalar Okuma");
            
            // Generate Excel file
            const excelBinary = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
            
            // Convert binary to Blob
            const buffer = new ArrayBuffer(excelBinary.length);
            const view = new Uint8Array(buffer);
            for (let i = 0; i < excelBinary.length; i++) {
                view[i] = excelBinary.charCodeAt(i) & 0xFF;
            }
            
            // Create Blob and download link
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            // Create timestamp for filename
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
            
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = `SCRIPT Okuma Raporları_${timestamp}.xlsx`;
            downloadContainer.classList.remove('hidden');
            
            updateLog('İşlem tamamlandı! Birleştirilmiş Excel dosyasını indirebilirsiniz.');
            updateStatus('Hazır! Dosya indirilmeye hazır.');
        } catch (error) {
            updateLog(`Excel dosyası oluşturulurken hata: ${error.message}`);
            updateStatus('Hata oluştu!');
        }
    }
    
    // Clear data arrays
    function clearData() {
        adaIsmiList = [];
        apartmanAdiList = [];
        daireNoList = [];
        aboneNoList = [];
        mahalList = [];
        seriNoList = [];
        tarihList = [];
        degerList = [];
        yorumList = [];
        
        // Clear log
        logElement.innerHTML = '<p>İşlem kayıtları burada görünecek...</p>';
        
        // Hide download link
        downloadContainer.classList.add('hidden');
    }
    
    // Update the status display
    function updateStatus(message) {
        statusElement.textContent = message;
    }
    
    // Add a message to the log
    function updateLog(message) {
        const logMessage = document.createElement('p');
        logMessage.textContent = message;
        logElement.appendChild(logMessage);
        logElement.scrollTop = logElement.scrollHeight;
    }
    
    // Add a separator line to the log
    function addLogSeparator() {
        const separator = document.createElement('div');
        separator.className = 'log-separator';
        separator.innerHTML = '<hr>';
        logElement.appendChild(separator);
        logElement.scrollTop = logElement.scrollHeight;
    }
});
