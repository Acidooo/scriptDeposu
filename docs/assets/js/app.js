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

    // State variables
    let uploadedFiles = [];
    let processedData = [];
    
    // Event Listeners
    fileUpload.addEventListener('change', handleFileUpload);
    processButton.addEventListener('click', processFiles);
    clearButton.addEventListener('click', clearForm);
    
    // Handle file upload
    function handleFileUpload(e) {
        uploadedFiles = Array.from(e.target.files).filter(file => 
            file.name.toLowerCase().includes('bifi_reading') && 
            (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))
        );
        
        fileCount.textContent = uploadedFiles.length > 0 ? 
            `${uploadedFiles.length} BIFI dosyası seçildi` : 
            'Seçilen dosya yok';
    }
    
    // Clear all form inputs
    function clearForm() {
        fileUpload.value = '';
        datesInput.value = '';
        uploadedFiles = [];
        fileCount.textContent = 'Seçilen dosya yok';
        document.getElementById('typeCurrent').checked = true;
        document.getElementById('combinedOutput').checked = true;
        hideResults();
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
        // Check pattern
        const pattern = /^\d{2}\.\d{2}\.\d{4}$/;
        if (!pattern.test(dateStr)) {
            return false;
        }
        
        // Check if it's a valid date
        const [day, month, year] = dateStr.split('.').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    }
    
    // Process files
    async function processFiles() {
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
        updateProgress(0, 'Dosyalar yükleniyor...');
        
        try {
            // Process files
            const allData = [];
            for (let i = 0; i < uploadedFiles.length; i++) {
                updateProgress(
                    (i / uploadedFiles.length) * 50, 
                    `Dosya işleniyor: ${i+1}/${uploadedFiles.length}`
                );
                
                const file = uploadedFiles[i];
                const adaIsmi = file.name.split('_')[0];
                const data = await readExcelFile(file, adaIsmi);
                allData.push(...data);
                
                // Give browser time to update UI
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            updateProgress(50, 'Veriler filtreleniyor...');
            
            // Process for each date
            const resultsByDate = {};
            let totalRecords = 0;
            
            for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
                const date = dates[dateIndex];
                
                updateProgress(
                    50 + ((dateIndex / dates.length) * 50), 
                    `${date} tarihine ait kayıtlar filtreleniyor...`
                );
                
                // Filter data for this date
                let filteredData = allData.filter(row => row.formattedDate === date);
                
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
                
                // Give browser time to update UI
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            
            updateProgress(100, 'İşlem tamamlandı!');
            
            // Display results
            processedData = resultsByDate;
            displayResults(processedData, dates, option, combineOutput, totalRecords);
            
        } catch (error) {
            console.error(error);
            alert('Dosyalar işlenirken bir hata oluştu: ' + error.message);
            updateProgress(0, 'Hata oluştu!');
        }
    }
    
    // Read an Excel file
    async function readExcelFile(file, adaIsmi) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get the first sheet
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Convert to JSON
                    let rows = XLSX.utils.sheet_to_json(worksheet);
                    
                    // Process rows to match our expected format
                    const processedRows = rows.map(row => {
                        const propertyName = Object.keys(row).find(key => 
                            key.toLowerCase().includes('property') || 
                            key.toLowerCase().includes('ada'));
                            
                        const dateName = Object.keys(row).find(key => 
                            key.toLowerCase().includes('date') || 
                            key.toLowerCase().includes('tarih'));
                            
                        const serialName = Object.keys(row).find(key => 
                            key.toLowerCase().includes('serial') || 
                            key.toLowerCase().includes('seri'));
                            
                        const valueName = Object.keys(row).find(key => 
                            key.toLowerCase().includes('value') || 
                            key.toLowerCase().includes('değer'));
                            
                        const typeName = Object.keys(row).find(key => 
                            key.toLowerCase().includes('type') || 
                            key.toLowerCase().includes('tip'));
                            
                        const mediumName = Object.keys(row).find(key => 
                            key.toLowerCase().includes('medium'));
                        
                        // Skip if date is missing
                        if (!row[dateName]) {
                            return null;
                        }
                        
                        // Process date
                        let dateValue;
                        if (typeof row[dateName] === 'string') {
                            dateValue = new Date(row[dateName]);
                        } else if (typeof row[dateName] === 'number') {
                            // Excel date (days since Jan 1, 1900)
                            dateValue = new Date((row[dateName] - 25569) * 86400 * 1000);
                        } else {
                            dateValue = new Date(row[dateName]);
                        }
                        
                        // Format date as dd.mm.yyyy
                        const formattedDate = dateValue.toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        }).replace(/\//g, '.');
                        
                        return {
                            adaIsmi: row[propertyName] || adaIsmi,
                            date: dateValue,
                            formattedDate: formattedDate,
                            serialNo: row[serialName] || '',
                            value: row[valueName] || 0,
                            type: row[typeName] || '',
                            medium: row[mediumName] || ''
                        };
                    }).filter(row => row !== null);
                    
                    resolve(processedRows);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Dosya okunamadı.'));
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
            // Combine all data
            let allFilteredData = [];
            dates.forEach(date => {
                if (data[date] && data[date].length > 0) {
                    allFilteredData = allFilteredData.concat(data[date]);
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
    
    // Generate Excel file and download
    function generateExcel(data, filename) {
        // Create worksheet with headers
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_json(worksheet, data.map(row => ({
            'Ada İsmi': row.adaIsmi,
            'Tarih': row.date, // Excel will format this
            'Seri No': row.serialNo,
            'Değer': row.value,
            'Tip': row.type,
            'Medium': row.medium,
            ...(row.processedDate ? {'İşlenen Tarih': row.processedDate} : {})
        })), { skipHeader: false, origin: 0 });
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tüm Adalar Okuma');
        
        // Generate and download
        XLSX.writeFile(workbook, filename);
    }
});
