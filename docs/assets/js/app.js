document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileUpload = document.getElementById('fileUpload');
    const fileCount = document.getElementById('fileCount');
    const datesInput = document.getElementById('dates');
    const processButton = document.getElementById('processButton');
    const clearButton = document.getElementById('clearButton');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar').querySelector('.progress-fill');
    const progressText = document.getElementById('progressText');
    const statusText = document.getElementById('statusText');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    const downloadButtons = document.getElementById('downloadButtons');
    
    // Performance options
    const CHUNK_SIZE = 5; // Process files in chunks of 5
    const BATCH_TIMEOUT = 50; // ms between batches to allow UI to refresh
    
    // State variables
    let uploadedFiles = [];
    let processedData = [];
    let isProcessing = false;
    
    // Event Listeners
    fileUpload.addEventListener('change', handleFileUpload);
    processButton.addEventListener('click', processFiles);
    clearButton.addEventListener('click', clearForm);
    
    // Handle file upload with size checking
    function handleFileUpload(e) {
        const files = Array.from(e.target.files);
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        
        // Warn if files are very large (>50MB total)
        if (totalSize > 50 * 1024 * 1024) {
            alert('Uyarı: Seçilen dosyaların toplam boyutu büyük (>' + 
                  Math.round(totalSize/1024/1024) + 'MB). ' +
                  'İşlem yavaş olabilir veya tarayıcı yanıt vermeyebilir. ' +
                  'Büyük dosyalar için masaüstü uygulamasını kullanmanız önerilir.');
        }
        
        uploadedFiles = files.filter(file => 
            file.name.toLowerCase().includes('bifi_reading') && 
            (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))
        );
        
        fileCount.textContent = uploadedFiles.length > 0 ? 
            `${uploadedFiles.length} BIFI dosyası seçildi (${formatFileSize(totalSize)})` : 
            'Seçilen dosya yok';
    }
    
    // Format file size in human-readable format
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    // Clear all form inputs
    function clearForm() {
        if (isProcessing) {
            if (!confirm('İşlem devam ediyor. İptal etmek istiyor musunuz?')) {
                return;
            }
        }
        
        fileUpload.value = '';
        datesInput.value = '';
        uploadedFiles = [];
        fileCount.textContent = 'Seçilen dosya yok';
        document.getElementById('typeCurrent').checked = true;
        document.getElementById('combinedOutput').checked = true;
        hideResults();
        isProcessing = false;
    }
    
    // Hide results section
    function hideResults() {
        resultsSection.style.display = 'none';
        progressSection.style.display = 'none';
        resultsContent.innerHTML = '';
        downloadButtons.innerHTML = '';
    }
    
    // Update progress bar
    function updateProgress(percent, message) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
        if (message) {
            statusText.textContent = message;
        }
    }
    
    // Validate date format (dd.mm.yyyy)
    function validateDateFormat(dateStr) {
        const pattern = /^\d{2}\.\d{2}\.\d{4}$/;
        if (!pattern.test(dateStr)) {
            return false;
        }
        
        const [day, month, year] = dateStr.split('.').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    }
    
    // Process files
    async function processFiles() {
        // Prevent multiple processing at once
        if (isProcessing) {
            alert('Lütfen mevcut işlemin tamamlanmasını bekleyin.');
            return;
        }
        
        // Validation
        if (uploadedFiles.length === 0) {
            alert('Lütfen en az bir BIFI Excel dosyası seçin.');
            return;
        }
        
        const dates = datesInput.value.split(',').map(d => d.trim()).filter(d => d);
        if (dates.length === 0) {
            alert('Lütfen en az bir tarih girin.');
            return;
        }
        
        // Validate dates
        const invalidDates = dates.filter(d => !validateDateFormat(d));
        if (invalidDates.length > 0) {
            alert(`Geçersiz tarih format(ları): ${invalidDates.join(', ')}\nLütfen GG.AA.YYYY formatında girin.`);
            return;
        }
        
        // Get option selection
        const option = document.querySelector('input[name="readingType"]:checked').value;
        const combineOutput = document.querySelector('input[name="outputType"]:checked').value === 'combined';
        
        // Show progress section
        hideResults();
        progressSection.style.display = 'block';
        updateProgress(0, 'İşleme başlanıyor...');
        isProcessing = true;
        
        try {
            // Process files in chunks to prevent UI freezing
            const allData = [];
            const totalFiles = uploadedFiles.length;
            
            // Create chunks of files for batch processing
            const fileChunks = [];
            for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
                fileChunks.push(uploadedFiles.slice(i, i + CHUNK_SIZE));
            }
            
            // Process each chunk with delay between chunks
            let processedCount = 0;
            
            for (let chunkIndex = 0; chunkIndex < fileChunks.length; chunkIndex++) {
                const chunk = fileChunks[chunkIndex];
                updateProgress(
                    (processedCount / totalFiles) * 50,
                    `Dosya grubu işleniyor: ${chunkIndex + 1}/${fileChunks.length}`
                );
                
                // Process files in this chunk concurrently
                const chunkPromises = chunk.map(file => {
                    const adaIsmi = file.name.split('_')[0];
                    return readExcelFile(file, adaIsmi).then(data => {
                        processedCount++;
                        updateProgress(
                            (processedCount / totalFiles) * 50,
                            `${processedCount}/${totalFiles} dosya işlendi`
                        );
                        return data;
                    });
                });
                
                const chunkResults = await Promise.all(chunkPromises);
                chunkResults.forEach(data => allData.push(...data));
                
                // Give UI time to breathe between chunks
                if (chunkIndex < fileChunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_TIMEOUT));
                }
            }
            
            updateProgress(50, 'Veriler filtreleniyor...');
            
            // Optimize memory by processing dates in batches too
            const resultsByDate = {};
            let totalRecords = 0;
            
            // Pre-filter data by date to avoid repeated filtering
            const preFilteredData = {};
            dates.forEach(date => {
                // Use a more efficient filter that creates fewer temporary objects
                preFilteredData[date] = allData.filter(row => row.formattedDate === date);
            });
            
            // Process each date
            for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
                const date = dates[dateIndex];
                
                updateProgress(
                    50 + ((dateIndex / dates.length) * 50),
                    `${date} tarihine ait kayıtlar filtreleniyor...`
                );
                
                // Get pre-filtered data for this date
                let filteredData = preFilteredData[date];
                
                // Apply option filter
                if (option === 'c') {
                    filteredData = filteredData.filter(row => row.type === 'Current');
                } else if (option === 'e') {
                    filteredData = filteredData.filter(row => row.type === 'EndOfMonth');
                }
                
                // Add processed date info
                filteredData.forEach(row => {
                    row.processedDate = date;
                });
                
                resultsByDate[date] = filteredData;
                totalRecords += filteredData.length;
                
                // Release memory from pre-filtered data
                if (dateIndex < dates.length - 1) {
                    // Give UI time to update between date processing
                    await new Promise(resolve => setTimeout(resolve, BATCH_TIMEOUT));
                }
            }
            
            // Clear pre-filtered data to free memory
            for (const key in preFilteredData) {
                preFilteredData[key] = null;
            }
            
            updateProgress(100, 'İşlem tamamlandı!');
            
            // Display results
            processedData = resultsByDate;
            displayResults(processedData, dates, option, combineOutput, totalRecords);
            
        } catch (error) {
            console.error(error);
            alert('Dosyalar işlenirken bir hata oluştu: ' + error.message);
            updateProgress(0, 'Hata oluştu!');
        } finally {
            isProcessing = false;
        }
    }
    
    // Read an Excel file more efficiently
    function readExcelFile(file, adaIsmi) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    // Process the file content
                    const data = new Uint8Array(e.target.result);
                    
                    // Use optimized SheetJS options for large files
                    const workbook = XLSX.read(data, { 
                        type: 'array',
                        cellStyles: false, // Disable style parsing for speed
                        cellHTML: false,   // Disable HTML parsing for speed
                        cellFormula: false, // Disable formula parsing for speed
                        cellNF: false,     // Disable number format parsing
                        cellDates: true    // Keep date handling
                    });
                    
                    // Get the first sheet
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Convert to JSON with optimized options
                    let rows = XLSX.utils.sheet_to_json(worksheet, {
                        header: 'A',  // Use A1 notation for headers
                        raw: true     // Keep raw values for speed
                    });
                    
                    // Get header names from first row
                    if (rows.length === 0) {
                        resolve([]);
                        return;
                    }
                    
                    const headers = rows.shift(); // Remove header row
                    
                    // Find column indices by approximate name matching
                    const headerIndices = {};
                    const columnPatterns = {
                        property: /property|ada/i,
                        date: /date|tarih/i,
                        serial: /serial|seri/i,
                        value: /value|değer/i,
                        type: /type|tip/i,
                        medium: /medium|medya/i
                    };
                    
                    // Find the column indices by name patterns
                    Object.entries(columnPatterns).forEach(([key, pattern]) => {
                        for (const [col, value] of Object.entries(headers)) {
                            if (value && pattern.test(value.toString().toLowerCase())) {
                                headerIndices[key] = col;
                                break;
                            }
                        }
                    });
                    
                    // Process rows with the identified column indices
                    const processedRows = [];
                    
                    for (const row of rows) {
                        // Skip empty rows
                        if (!row[headerIndices.date]) {
                            continue;
                        }
                        
                        // Process date
                        let dateValue;
                        const rawDate = row[headerIndices.date];
                        
                        if (typeof rawDate === 'string') {
                            dateValue = new Date(rawDate);
                        } else if (typeof rawDate === 'number') {
                            // Excel date (days since Jan 1, 1900)
                            dateValue = new Date((rawDate - 25569) * 86400 * 1000);
                        } else {
                            dateValue = new Date(rawDate);
                        }
                        
                        // Check if date is valid
                        if (isNaN(dateValue.getTime())) {
                            continue;
                        }
                        
                        // Format date as dd.mm.yyyy
                        const formattedDate = dateValue.toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        }).replace(/\//g, '.');
                        
                        // Get property name, default to filename-derived name
                        const propertyCol = headerIndices.property;
                        const adaIsmiValue = propertyCol && row[propertyCol] ? row[propertyCol] : adaIsmi;
                        
                        processedRows.push({
                            adaIsmi: adaIsmiValue,
                            date: dateValue,
                            formattedDate: formattedDate,
                            serialNo: headerIndices.serial ? row[headerIndices.serial] || '' : '',
                            value: headerIndices.value ? row[headerIndices.value] || 0 : 0,
                            type: headerIndices.type ? row[headerIndices.type] || '' : '',
                            medium: headerIndices.medium ? row[headerIndices.medium] || '' : ''
                        });
                    }
                    
                    // Clean up to help garbage collection
                    rows = null;
                    
                    resolve(processedRows);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error(`'${file.name}' dosyası okunamadı.`));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    // Display results
    function displayResults(data, dates, option, combineOutput, totalRecords) {
        resultsSection.style.display = 'block';
        
        // Create results summary
        let html = `<h3>İşlem Özeti</h3>
                   <p>İşlenen dosya sayısı: ${uploadedFiles.length}</p>
                   <p>İşlenen tarih sayısı: ${dates.length}</p>
                   <p>Seçilen okuma tipi: ${option === 'c' ? 'Current' : option === 'e' ? 'End of Month' : 'All'}</p>
                   <p>Toplam bulunan kayıt sayısı: ${totalRecords}</p>`;
                   
        // Create date summary
        html += '<h3>Tarih Bazlı Sonuçlar</h3><ul>';
        dates.forEach(date => {
            const recordCount = data[date] ? data[date].length : 0;
            html += `<li>${date}: ${recordCount} kayıt</li>`;
        });
        html += '</ul>';
        
        resultsContent.innerHTML = html;
        
        // Create download buttons
        downloadButtons.innerHTML = '';
        
        // If combining output
        if (combineOutput) {
            // Combine all data efficiently
            const allFilteredData = [];
            dates.forEach(date => {
                if (data[date] && data[date].length > 0) {
                    allFilteredData.push(...data[date]);
                }
            });
            
            if (allFilteredData.length > 0) {
                // Create download button
                const datesStr = dates.length <= 3 ? dates.join('-') : `${dates.length}_tarih`;
                const filename = `SCRIPT BIFI ${datesStr}(${option}) Birleştirilmiş Okuma Raporları.xlsx`;
                
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'button primary';
                downloadBtn.textContent = `${filename} İndir`;
                downloadBtn.onclick = () => generateExcel(allFilteredData, filename);
                downloadButtons.appendChild(downloadBtn);
            } else {
                downloadButtons.innerHTML = '<p>İndirilebilecek sonuç bulunamadı.</p>';
            }
        }
        // If separate outputs
        else {
            let hasAnyData = false;
            
            dates.forEach(date => {
                if (data[date] && data[date].length > 0) {
                    hasAnyData = true;
                    
                    const filename = `SCRIPT BIFI ${date}(${option}) Tarihli Okuma Raporları.xlsx`;
                    
                    const downloadBtn = document.createElement('button');
                    downloadBtn.className = 'button';
                    downloadBtn.textContent = `${date} İndir`;
                    downloadBtn.onclick = () => generateExcel(data[date], filename);
                    downloadButtons.appendChild(downloadBtn);
                }
            });
            
            if (!hasAnyData) {
                downloadButtons.innerHTML = '<p>İndirilebilecek sonuç bulunamadı.</p>';
            }
        }
    }
    
    // Generate Excel file and download more efficiently
    function generateExcel(data, filename) {
        // Show that download is starting
        statusText.textContent = 'Excel dosyası hazırlanıyor...';
        
        // Use timeout to allow UI to update before the heavy Excel generation
        setTimeout(() => {
            try {
                // Create worksheet with optimized approach
                const worksheet = XLSX.utils.json_to_sheet(
                    data.map(row => ({
                        'Ada İsmi': row.adaIsmi,
                        'Tarih': row.date,
                        'Seri No': row.serialNo,
                        'Değer': row.value,
                        'Tip': row.type,
                        'Medium': row.medium,
                        ...(row.processedDate ? {'İşlenen Tarih': row.processedDate} : {})
                    }))
                );
                
                // Create workbook
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Tüm Adalar Okuma');
                
                // Generate and download
                XLSX.writeFile(workbook, filename);
                
                statusText.textContent = 'İşlem tamamlandı!';
            } catch (error) {
                console.error('Excel oluşturulurken hata:', error);
                statusText.textContent = 'Excel oluşturulurken hata!';
                alert('Excel dosyası oluşturulurken bir hata oluştu: ' + error.message);
            }
        }, 100);
    }
});
