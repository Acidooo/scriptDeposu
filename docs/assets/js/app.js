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
    const ENABLE_JSON_OPTIMIZATION = true; // Enable the JSON optimization for large datasets
    const DEBUG_MODE = true; // Enable more detailed debug info
    
    // State variables
    let uploadedFiles = [];
    let processedData = [];
    let optimizedDataCache = null; // Cache for the optimized JSON data
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
        
        // Clear the cached data when form is cleared
        optimizedDataCache = null;
        
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
            // First step: Convert all Excel files to optimized JSON format
            let allData = [];
            
            if (ENABLE_JSON_OPTIMIZATION) {
                // If we already have optimized data in cache, use it
                if (optimizedDataCache) {
                    updateProgress(40, 'Önbelleğe alınmış veri kullanılıyor...');
                    allData = optimizedDataCache;
                } else {
                    // Convert Excel files to optimized JSON format
                    updateProgress(10, 'Excel dosyaları JSON formatına dönüştürülüyor...');
                    allData = await convertExcelFilesToOptimizedJson();
                    // Cache the optimized data for reuse
                    optimizedDataCache = allData;
                }
            } else {
                // Original implementation: process files in chunks
                // ...existing chunk processing code...
            }
            
            updateProgress(50, 'Veriler filtreleniyor...');
            
            // Second step: Filter the optimized data by dates
            const resultsByDate = {};
            let totalRecords = 0;
            
            // Quick lookup table for dates to improve performance
            const dateSet = new Set(dates);
            
            if (DEBUG_MODE) {
                console.log("Looking for these dates:", [...dateSet]);
                console.log("Total records in all data:", allData.length);
                
                // Log some formatted dates from the data to help debug
                console.log("Sample of formatted dates in data:");
                const sampleDates = new Set();
                allData.slice(0, 1000).forEach(row => {
                    if (sampleDates.size < 20) {
                        sampleDates.add(row.formattedDate);
                    }
                });
                console.log([...sampleDates].sort());
            }
            
            // Filter once by date to avoid repeated filtering
            const relevantData = allData.filter(row => dateSet.has(row.formattedDate));
            
            if (DEBUG_MODE) {
                console.log(`Found ${relevantData.length} relevant records matching the specified dates`);
            }
            
            // Process each date
            for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
                const date = dates[dateIndex];
                
                updateProgress(
                    50 + ((dateIndex / dates.length) * 50),
                    `${date} tarihine ait kayıtlar filtreleniyor...`
                );
                
                // Filter data for this specific date
                let filteredData = relevantData.filter(row => row.formattedDate === date);
                
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
                
                // Give UI time to update between date processing
                if (dateIndex < dates.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_TIMEOUT));
                }
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
    
    // Convert all Excel files to optimized JSON format
    async function convertExcelFilesToOptimizedJson() {
        const totalFiles = uploadedFiles.length;
        const allData = [];
        
        // Create chunks of files for batch processing
        const fileChunks = [];
        for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
            fileChunks.push(uploadedFiles.slice(i, i + CHUNK_SIZE));
        }
        
        let processedCount = 0;
        
        // Process each chunk of files
        for (let chunkIndex = 0; chunkIndex < fileChunks.length; chunkIndex++) {
            const chunk = fileChunks[chunkIndex];
            updateProgress(
                (processedCount / totalFiles) * 40, // Use first 40% for conversion
                `Excel dosyaları JSON formatına dönüştürülüyor: ${processedCount}/${totalFiles}`
            );
            
            // Process files in this chunk concurrently
            const chunkPromises = chunk.map(file => {
                const adaIsmi = file.name.split('_')[0];
                return convertExcelToJson(file, adaIsmi).then(data => {
                    processedCount++;
                    updateProgress(
                        (processedCount / totalFiles) * 40,
                        `Excel dosyaları JSON formatına dönüştürülüyor: ${processedCount}/${totalFiles}`
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
        
        return allData;
    }
    
    // Convert a single Excel file to optimized JSON
    function convertExcelToJson(file, adaIsmi) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    
                    // Use optimized SheetJS options for speed
                    const workbook = XLSX.read(data, { 
                        type: 'array',
                        cellStyles: false,
                        cellHTML: false,
                        cellFormula: false,
                        cellNF: false,
                        cellDates: true,
                        dense: true // Use dense output for better performance
                    });
                    
                    // Get the first sheet
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    
                    // Find the header row and identify column names
                    const range = XLSX.utils.decode_range(sheet['!ref']);
                    let headerRowIndex = null;
                    let headerColumns = {};
                    
                    if (DEBUG_MODE) {
                        console.log(`Processing file: ${file.name}`);
                    }
                    
                    // First, look for header rows by examining first few rows
                    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
                        let headerCandidates = {};
                        let columnFound = 0;
                        
                        for (let c = range.s.c; c <= range.e.c; c++) {
                            const cellAddress = XLSX.utils.encode_cell({r: r, c: c});
                            const cell = sheet[cellAddress];
                            
                            if (cell && cell.t === 's') {
                                const value = cell.v.toString().toLowerCase();
                                
                                if (DEBUG_MODE) {
                                    console.log(`Row ${r}, Col ${c}: ${value}`);
                                }
                                
                                if (value.includes('property') || value.includes('ada')) {
                                    headerCandidates.property = c;
                                    columnFound++;
                                } else if (value.includes('date') || value.includes('tarih') || value.includes('reading date')) {
                                    headerCandidates.date = c;
                                    columnFound++;
                                } else if (value.includes('serial') || value.includes('seri') || value.includes('device serial')) {
                                    headerCandidates.serial = c;
                                    columnFound++;
                                } else if (value.includes('value') || value.includes('değer') || value.includes('reading value')) {
                                    headerCandidates.value = c;
                                    columnFound++;
                                } else if (value.includes('type') || value.includes('tip') || value.includes('reading type')) {
                                    headerCandidates.type = c;
                                    columnFound++;
                                } else if (value.includes('medium') || value.includes('reading medium')) {
                                    headerCandidates.medium = c;
                                    columnFound++;
                                }
                            }
                        }
                        
                        if (columnFound >= 2) { // We found at least 2 expected columns, likely the header row
                            headerRowIndex = r;
                            headerColumns = headerCandidates;
                            break;
                        }
                    }
                    
                    if (headerRowIndex === null) {
                        // Fallback - assume first row is header and make best guesses
                        headerRowIndex = range.s.r;
                        // Make educated guesses about column positions
                        headerColumns = {
                            property: 0,
                            date: 1,
                            serial: 2,
                            value: 3,
                            type: 4,
                            medium: 5
                        };
                    }
                    
                    if (DEBUG_MODE) {
                        console.log(`Header found at row ${headerRowIndex}`);
                        console.log("Header column mapping:", headerColumns);
                    }
                    
                    // Extract data rows
                    const optimizedRows = [];
                    
                    for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
                        // Check if we have a date in the date column
                        if (headerColumns.date === undefined) {
                            console.warn(`Date column not found in ${file.name}`);
                            continue;
                        }
                        
                        const dateCell = sheet[XLSX.utils.encode_cell({r: r, c: headerColumns.date})];
                        if (!dateCell) continue;
                        
                        // Process the date
                        let dateValue;
                        if (dateCell.t === 's') {
                            dateValue = new Date(dateCell.v);
                        } else if (dateCell.t === 'n') {
                            // Excel numeric date
                            dateValue = new Date((dateCell.v - 25569) * 86400 * 1000);
                        } else {
                            dateValue = new Date(dateCell.v);
                        }
                        
                        // Skip invalid dates
                        if (isNaN(dateValue.getTime())) {
                            continue;
                        }
                        
                        // Format date as dd.mm.yyyy for filtering - IMPORTANT FIX HERE:
                        // We need to ensure we're using consistent formatting for comparison
                        const day = String(dateValue.getDate()).padStart(2, '0');
                        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
                        const year = dateValue.getFullYear();
                        const formattedDate = `${day}.${month}.${year}`;
                        
                        // Debug every 100th row to avoid console spam
                        if (DEBUG_MODE && r % 100 === 0) {
                            console.log(`Row ${r} - Date: ${dateCell.v} → ${formattedDate}`);
                        }
                        
                        // Get other cell values
                        const getCell = (colType) => {
                            if (headerColumns[colType] === undefined) return null;
                            const cell = sheet[XLSX.utils.encode_cell({r: r, c: headerColumns[colType]})];
                            return cell ? cell.v : null;
                        };
                        
                        // Try to detect type column properly
                        const typeValue = getCell('type');
                        
                        // Create optimized row object
                        optimizedRows.push({
                            adaIsmi: getCell('property') || adaIsmi,
                            date: dateValue,
                            formattedDate: formattedDate,
                            serialNo: getCell('serial') || '',
                            value: getCell('value') || 0,
                            type: typeValue || '',
                            medium: getCell('medium') || ''
                        });
                    }
                    
                    if (DEBUG_MODE) {
                        console.log(`Found ${optimizedRows.length} rows with valid dates in ${file.name}`);
                        // Show histogram of dates
                        const dateHistogram = {};
                        optimizedRows.forEach(row => {
                            if (!dateHistogram[row.formattedDate]) dateHistogram[row.formattedDate] = 0;
                            dateHistogram[row.formattedDate]++;
                        });
                        console.log("Date histogram:", dateHistogram);
                    }
                    
                    // Free memory
                    delete workbook.Sheets[sheetName];
                    delete workbook.Sheets;
                    delete workbook;
                    
                    resolve(optimizedRows);
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
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
