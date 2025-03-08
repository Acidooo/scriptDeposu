document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const csvFileInput = document.getElementById('csvFile');
    const processBtn = document.getElementById('processBtn');
    const statusElement = document.getElementById('status');
    const logElement = document.getElementById('log');
    const downloadContainer = document.getElementById('downloadContainer');
    const downloadLinksContainer = document.getElementById('downloadLinks');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const downloadCombinedBtn = document.getElementById('downloadCombinedBtn');
    
    // Store processed files data
    let processedFiles = [];
    
    // Add event listeners
    processBtn.addEventListener('click', processCSVFiles);
    downloadAllBtn.addEventListener('click', downloadAllFiles);
    downloadCombinedBtn.addEventListener('click', downloadCombinedCSV);
    
    // Main processing function for multiple files
    function processCSVFiles() {
        const files = csvFileInput.files;
        if (!files || files.length === 0) {
            updateLog('Lütfen en az bir CSV dosyası seçin.');
            return;
        }
        
        updateStatus(`İşleniyor... (0/${files.length})`);
        clearDownloadLinks();
        processedFiles = []; // Clear previously processed files
        
        // Process files sequentially
        let fileIndex = 0;
        processNextFile();
        
        function processNextFile() {
            if (fileIndex >= files.length) {
                updateStatus(`İşlem tamamlandı! ${files.length} dosya işlendi.`);
                downloadContainer.classList.remove('hidden');
                return;
            }
            
            // Add separator line between files (except before the first file)
            if (fileIndex > 0) {
                addLogSeparator();
            }
            
            const file = files[fileIndex];
            updateLog(`"${file.name}" dosyası işleniyor (${fileIndex + 1}/${files.length})...`);
            updateStatus(`İşleniyor... (${fileIndex + 1}/${files.length})`);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    // Parse CSV content
                    const csvContent = e.target.result;
                    let csvData = parseCSV(csvContent);
                    
                    // Process the data similar to Python script
                    updateLog(`"${file.name}" yüklendi. Satır sayısı: ${csvData.length}`);
                    
                    // Step 1: Remove rows with empty Zip code
                    updateLog('Boş Zip code içeren satırlar siliniyor...');
                    csvData = csvData.filter(row => row['Zip code'] && row['Zip code'].trim() !== '');
                    
                    // Step 2: Fill NA values in Value column with 0
                    updateLog('Value sütunundaki boş değerler 0 ile dolduruluyor...');
                    csvData.forEach(row => {
                        if (!row['Value'] || row['Value'].trim() === '') {
                            row['Value'] = '0';
                        }
                    });
                    
                    // Step 3: Extract numeric part from Zip code
                    updateLog('Zip code\'dan sayısal değerler çıkarılıyor...');
                    csvData.forEach(row => {
                        const match = row['Zip code'].match(/\d+$/);
                        if (match) {
                            row['Zip code'] = parseInt(match[0], 10);
                        }
                    });
                    
                    // Step 4: Convert Value column to integers
                    updateLog('Value sütunu tamsayılara dönüştürülüyor...');
                    csvData.forEach(row => {
                        row['Value'] = parseInt(row['Value'], 10) || 0;
                    });
                    
                    // Step 5: Sort by Zip code in ascending order
                    updateLog('Zip code\'a göre sıralanıyor...');
                    csvData.sort((a, b) => a['Zip code'] - b['Zip code']);
                    
                    // Generate sorted CSV
                    updateLog('Sıralanmış CSV dosyası oluşturuluyor...');
                    const sortedCSV = generateCSV(csvData);
                    
                    // Create download link
                    const fileName = file.name.replace('.csv', 'SIRALI.csv');
                    const blob = new Blob([sortedCSV], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    
                    // Store processed file data
                    processedFiles.push({
                        fileName: fileName,
                        content: sortedCSV
                    });
                    
                    createDownloadLink(url, fileName);
                    
                    updateLog(`"${file.name}" dosyası işlendi.`);
                    
                    // Process next file
                    fileIndex++;
                    processNextFile();
                } catch (error) {
                    updateLog(`"${file.name}" dosyası işlenirken hata: ${error.message}`);
                    
                    // Continue with next file despite error
                    fileIndex++;
                    processNextFile();
                }
            };
            
            reader.onerror = function() {
                updateLog(`"${file.name}" dosyası okunurken hata!`);
                
                // Continue with next file despite error
                fileIndex++;
                processNextFile();
            };
            
            reader.readAsText(file);
        }
    }
    
    // Download all processed files as a ZIP archive
    function downloadAllFiles() {
        if (processedFiles.length === 0) {
            updateLog('İndirilecek işlenmiş dosya bulunamadı.');
            return;
        }
        
        updateLog('Tüm dosyalar ZIP arşivi olarak hazırlanıyor...');
        
        // Create a new JSZip instance
        const zip = new JSZip();
        
        // Add all processed files to the ZIP
        processedFiles.forEach(file => {
            zip.file(file.fileName, file.content);
        });
        
        // Generate the ZIP file
        zip.generateAsync({type: 'blob'})
            .then(function(content) {
                // Create and trigger download
                const zipFileName = 'sirali_csv_dosyalari.zip';
                const url = URL.createObjectURL(content);
                
                const tempLink = document.createElement('a');
                tempLink.href = url;
                tempLink.download = zipFileName;
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
                
                updateLog(`Tüm işlenmiş dosyalar "${zipFileName}" olarak indirildi.`);
            })
            .catch(function(error) {
                updateLog(`ZIP dosyası oluşturulurken hata: ${error.message}`);
            });
    }
    
    // Download all processed files as a single combined CSV
    function downloadCombinedCSV() {
        if (processedFiles.length === 0) {
            updateLog('İndirilecek işlenmiş dosya bulunamadı.');
            return;
        }
        
        updateLog('Tüm dosyalar tek bir CSV olarak birleştiriliyor...');
        
        try {
            // Parse the first file to get headers and start the combined content
            let firstFileData = processedFiles[0].content;
            let lines = firstFileData.split('\n');
            let headers = lines[0]; // Get headers from first file
            let headerArray = headers.split(';').map(header => header.trim());
            
            // Find the "city" column index (if exists)
            let cityColumnIndex = -1;
            for (let i = 0; i < headerArray.length; i++) {
                if (headerArray[i].toLowerCase() === 'city') {
                    cityColumnIndex = i;
                    break;
                }
            }
            
            updateLog(`"city" sütunu ${cityColumnIndex !== -1 ? 'bulundu' : 'bulunamadı'}.`);
            
            let combinedContent = headers + '\n'; // Start with headers
            
            // Process each file and add its content (excluding headers)
            processedFiles.forEach((file, index) => {
                if (index > 0) {
                    addLogSeparator();
                }
                
                const content = file.content;
                const fileLines = content.split('\n');
                
                // Skip header line (first line) except for the first file
                const startLine = index === 0 ? 1 : 1;
                
                // Add all data lines to combined content
                for (let i = startLine; i < fileLines.length; i++) {
                    if (fileLines[i].trim() !== '') {
                        let line = fileLines[i];
                        
                        // Clean city column if found
                        if (cityColumnIndex !== -1) {
                            let values = line.split(';');
                            if (values.length > cityColumnIndex) {
                                // Remove PARK and ORAN from the city column
                                values[cityColumnIndex] = values[cityColumnIndex]
                                    .replace(/PARK/gi, '')
                                    .replace(/ORAN/gi, '')
                                    .trim();
                                line = values.join(';');
                            }
                        }
                        
                        combinedContent += line + '\n';
                    }
                }
                
                updateLog(`"${file.fileName}" dosyası birleştirildi.`);
            });
            
            // Create blob and download link
            const blob = new Blob([combinedContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const combinedFileName = `birlestirilmis_csv_${timestamp}.csv`;
            
            const tempLink = document.createElement('a');
            tempLink.href = url;
            tempLink.download = combinedFileName;
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            
            updateLog(`Tüm dosyalar "${combinedFileName}" olarak birleştirilip indirildi (city sütununda PARK ve ORAN kelimeleri kaldırıldı).`);
        } catch (error) {
            updateLog(`Dosyalar birleştirilirken hata: ${error.message}`);
        }
    }
    
    // Create a download link for a processed file
    function createDownloadLink(url, fileName) {
        const linkContainer = document.createElement('div');
        linkContainer.className = 'download-link-item';
        
        const link = document.createElement('a');
        link.href = url;
        link.className = 'download-button';
        link.download = fileName;
        link.textContent = fileName;
        
        linkContainer.appendChild(link);
        downloadLinksContainer.appendChild(linkContainer);
    }
    
    // Clear all download links
    function clearDownloadLinks() {
        downloadLinksContainer.innerHTML = '';
    }
    
    // Parse CSV string to array of objects
    function parseCSV(csvString) {
        const lines = csvString.split('\n');
        const headers = lines[0].split(';').map(header => header.trim());
        
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = line.split(';');
                const obj = {};
                
                headers.forEach((header, index) => {
                    obj[header] = values[index] !== undefined ? values[index] : '';
                });
                
                result.push(obj);
            }
        }
        
        return result;
    }
    
    // Generate CSV string from array of objects
    function generateCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        let csvContent = headers.join(';') + '\n';
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] !== undefined && row[header] !== null ? row[header] : '';
                return value;
            });
            csvContent += values.join(';') + '\n';
        });
        
        return csvContent;
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
