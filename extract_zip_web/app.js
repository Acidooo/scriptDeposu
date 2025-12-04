// Add DOMContentLoaded event handler to ensure the DOM is fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const selectSrcBtn = document.getElementById('selectSrcBtn');
    const selectDstBtn = document.getElementById('selectDstBtn');
    const extractBtn = document.getElementById('extractBtn');
    const srcFolderDisplay = document.getElementById('srcFolder');
    const dstFolderDisplay = document.getElementById('dstFolder');
    const statusDisplay = document.getElementById('status');
    const logElement = document.getElementById('log');
    // New status elements
    const zipCounter = document.getElementById('zipCounter');
    const folderWarning = document.getElementById('folderWarning');
    const progressCounter = document.getElementById('progressCounter');
    
    // State variables
    let currentZipCount = 0;
    let totalZipCount = 0;
    let currentZipIndex = 0;

    // Check if File System Access API is available
    if (!('showDirectoryPicker' in window)) {
        logMessage('Tarayıcınız Dosya Sistemi Erişim API\'sini desteklemiyor. Lütfen Chrome veya Edge kullanın.');
        disableButtons();
    }

    // Event Listeners
    selectSrcBtn.addEventListener('click', selectSourceFolder);
    selectDstBtn.addEventListener('click', selectDestinationFolder);
    extractBtn.addEventListener('click', extractAllZipFiles);
    
    // Global variables to store directory handles
    let sourceDirectoryHandle = null;
    let destDirectoryHandle = null;
    
    // Category folders
    const categoryFolders = [
        "Montaj Raporu",
        "Okuma Raporu",
        "Bifi",
        "Bifi_Reading"
    ];
    
    // Dictionary to map category keywords to folder names
    const categoryMapping = {
        "montaj raporu": "Montaj Raporu",
        "okuma raporu": "Okuma Raporu",
        "bifi_reading": "Bifi_Reading",
        "bifi": "Bifi"
    };

    // Try to load saved directory handles from localStorage
    async function loadSavedDirectoryHandles() {
        try {
            // Check if we have serialized handles in localStorage
            const savedSourceHandle = localStorage.getItem('sourceDirectoryHandle');
            const savedDestHandle = localStorage.getItem('destDirectoryHandle');
            
            if (savedSourceHandle) {
                try {
                    // Use the File System Access API to restore permissions
                    const handle = JSON.parse(savedSourceHandle);
                    // Verify we still have permission
                    if (await verifyPermission(handle, true)) {
                        sourceDirectoryHandle = handle;
                        srcFolderDisplay.textContent = sourceDirectoryHandle.name;
                        logMessage(`Kaynak klasöre erişim yenilendi: ${sourceDirectoryHandle.name}`);
                    }
                } catch (error) {
                    console.error("Kaynak klasör bilgisi yüklenirken hata:", error);
                    localStorage.removeItem('sourceDirectoryHandle');
                }
            }
            
            if (savedDestHandle) {
                try {
                    const handle = JSON.parse(savedDestHandle);
                    if (await verifyPermission(handle, true)) {
                        destDirectoryHandle = handle;
                        dstFolderDisplay.textContent = destDirectoryHandle.name;
                        logMessage(`Hedef klasöre erişim yenilendi: ${destDirectoryHandle.name}`);
                    }
                } catch (error) {
                    console.error("Hedef klasör bilgisi yüklenirken hata:", error);
                    localStorage.removeItem('destDirectoryHandle');
                }
            }
            
            // If we successfully loaded the handles, update counters
            if (sourceDirectoryHandle) {
                await updateZipFileCount();
            }
            if (destDirectoryHandle) {
                await checkIfFolderEmpty();
            }
            
            // Enable extract button if both handles are available
            checkIfReadyToExtract();
        } catch (error) {
            console.error("Kaydedilmiş klasör bilgilerini yüklerken hata:", error);
        }
    }

    // Function to verify/request permission for a directory handle
    async function verifyPermission(fileHandle, readWrite) {
        const options = {};
        if (readWrite) {
            options.mode = 'readwrite';
        }
        
        // Check if we already have permission, if not, request it
        if ((await fileHandle.queryPermission(options)) === 'granted') {
            return true;
        }
        
        // Request permission
        if ((await fileHandle.requestPermission(options)) === 'granted') {
            return true;
        }
        
        // Permission denied
        return false;
    }

    // Function to select source folder
    async function selectSourceFolder() {
        try {
            const handle = await window.showDirectoryPicker();
            // Request persistent permission
            if (await verifyPermission(handle, false)) {
                sourceDirectoryHandle = handle;
                srcFolderDisplay.textContent = sourceDirectoryHandle.name;
                logMessage(`Kaynak klasör seçildi: ${sourceDirectoryHandle.name}`);
                
                // Save the handle to localStorage (using a helper function to avoid serialization issues)
                saveDirectoryHandle('sourceDirectoryHandle', handle);
                
                // Count ZIP files and update counter
                await updateZipFileCount();
                
                checkIfReadyToExtract();
            }
        } catch (error) {
            logMessage(`Kaynak klasör seçilirken hata: ${error.message}`);
        }
    }

    // Function to select destination folder
    async function selectDestinationFolder() {
        try {
            const handle = await window.showDirectoryPicker();
            // Request persistent permission with write access
            if (await verifyPermission(handle, true)) {
                destDirectoryHandle = handle;
                dstFolderDisplay.textContent = destDirectoryHandle.name;
                logMessage(`Hedef klasör seçildi: ${destDirectoryHandle.name}`);
                
                // Save the handle to localStorage
                saveDirectoryHandle('destDirectoryHandle', handle);
                
                // Check if folder is empty
                await checkIfFolderEmpty();
                
                checkIfReadyToExtract();
            }
        } catch (error) {
            logMessage(`Hedef klasör seçilirken hata: ${error.message}`);
        }
    }

    // Helper function to save directory handle to localStorage
    function saveDirectoryHandle(key, handle) {
        try {
            localStorage.setItem(key, JSON.stringify(handle));
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        }
    }

    // Load saved handles when the app starts
    loadSavedDirectoryHandles();

    // Function to log messages
    function logMessage(message, isSection = false) {
        const p = document.createElement('p');
        p.textContent = message;
        
        if (isSection) {
            p.style.borderBottom = '1px dashed #ccc';
            p.style.paddingBottom = '5px';
        }
        
        logElement.appendChild(p);
        logElement.scrollTop = logElement.scrollHeight;
    }

    // Check if both folders are selected to enable extract button
    function checkIfReadyToExtract() {
        if (sourceDirectoryHandle && destDirectoryHandle) {
            extractBtn.disabled = false;
        }
    }

    // Function to recursively find all ZIP files in the directory
    async function findAllZipFiles(directoryHandle, path = '') {
        const zipFiles = [];
        
        for await (const entry of directoryHandle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            
            if (entry.kind === 'directory') {
                const subDirZips = await findAllZipFiles(entry, entryPath);
                zipFiles.push(...subDirZips);
            } else if (entry.name.toLowerCase().endsWith('.zip')) {
                zipFiles.push({
                    handle: entry,
                    path: entryPath
                });
            }
        }
        
        return zipFiles;
    }

    // Function to recursively find all XLSX files in the directory
    async function findAllXlsxFiles(directoryHandle, path = '') {
        const xlsxFiles = [];
        
        for await (const entry of directoryHandle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            
            if (entry.kind === 'directory') {
                const subDirXlsx = await findAllXlsxFiles(entry, entryPath);
                xlsxFiles.push(...subDirXlsx);
            } else if (entry.name.toLowerCase().endsWith('.xlsx')) {
                xlsxFiles.push({
                    handle: entry,
                    path: entryPath
                });
            }
        }
        
        return xlsxFiles;
    }

    // Determine the appropriate folder for a file based on its name
    function determineTargetFolder(filename) {
        const lowerCaseFilename = filename.toLowerCase();
        
        // Check keywords in priority order (longer/more specific keywords first)
        // bifi_reading must be checked before bifi
        if (lowerCaseFilename.includes("bifi_reading")) {
            return "Bifi_Reading";
        }
        if (lowerCaseFilename.includes("bifi")) {
            return "Bifi";
        }
        if (lowerCaseFilename.includes("montaj raporu")) {
            return "Montaj Raporu";
        }
        if (lowerCaseFilename.includes("okuma raporu")) {
            return "Okuma Raporu";
        }
        
        // If no category matches, return null for the root destination folder
        return null;
    }
    
    // Create category folders in the destination directory
    async function createCategoryFolders() {
        for (const folder of categoryFolders) {
            try {
                await destDirectoryHandle.getDirectoryHandle(folder, { create: true });
                logMessage(`'${folder}' klasörü oluşturuldu veya mevcut klasör kullanıldı`);
            } catch (error) {
                logMessage(`'${folder}' klasörü oluşturulurken hata: ${error.message}`);
            }
        }
    }

    // Extract a single ZIP file
    async function extractZipFile(zipFileEntry) {
        const file = await zipFileEntry.handle.getFile();
        const zipData = await file.arrayBuffer();
        
        try {
            const zip = await JSZip.loadAsync(zipData);
            
            for (const [filename, zipEntry] of Object.entries(zip.files)) {
                if (zipEntry.dir) continue;
                
                try {
                    // Determine target folder based on filename
                    const targetCategory = determineTargetFolder(filename);
                    
                    // Create subdirectories if needed
                    const pathParts = filename.split('/');
                    const actualFilename = pathParts.pop();
                    
                    // Start with destination directory or category subfolder
                    let currentDirHandle = destDirectoryHandle;
                    
                    // If a category is matched, use that folder as base
                    if (targetCategory) {
                        currentDirHandle = await destDirectoryHandle.getDirectoryHandle(targetCategory, { create: true });
                    }
                    
                    // Create directory structure if needed (from the ZIP file)
                    for (const part of pathParts) {
                        if (!part) continue;
                        
                        try {
                            currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: true });
                        } catch (dirError) {
                            logMessage(`Uyarı: '${part}' klasörü oluşturulamadı: ${dirError.message}`);
                        }
                    }
                    
                    // Extract and write file
                    const content = await zipEntry.async('arraybuffer');
                    const fileHandle = await currentDirHandle.getFileHandle(actualFilename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    
                    // if (targetCategory) {
                    //     logMessage(`"${actualFilename}" dosyası "${targetCategory}" klasörüne yerleştirildi`);
                    // }
                    
                } catch (fileError) {
                    logMessage(`'${filename}' dosyası çıkarılırken hata: ${fileError.message}`);
                }
            }
            
            return true;
        } catch (error) {
            logMessage(`'${zipFileEntry.path}' ZIP dosyası işlenirken hata: ${error.message}`);
            return false;
        }
    }

    // Move a single XLSX file to the appropriate category
    async function moveXlsxFile(xlsxFileEntry) {
        try {
            const file = await xlsxFileEntry.handle.getFile();
            const content = await file.arrayBuffer();
            const actualFilename = xlsxFileEntry.handle.name;
            
            // Determine target folder based on filename
            const targetCategory = determineTargetFolder(actualFilename);
            
            // Start with destination directory or category subfolder
            let currentDirHandle = destDirectoryHandle;
            
            // If a category is matched, use that folder as base
            if (targetCategory) {
                currentDirHandle = await destDirectoryHandle.getDirectoryHandle(targetCategory, { create: true });
            }
            
            // Write file directly to category folder (no source directory structure)
            const fileHandle = await currentDirHandle.getFileHandle(actualFilename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            return true;
        } catch (error) {
            logMessage(`'${xlsxFileEntry.path}' XLSX dosyası taşınırken hata: ${error.message}`);
            return false;
        }
    }

    // Main function to extract all ZIP files
    async function extractAllZipFiles() {
        try {
            // Disable buttons during extraction
            selectSrcBtn.disabled = true;
            selectDstBtn.disabled = true;
            extractBtn.disabled = true;
            statusDisplay.textContent = "İşleniyor...";
            
            // Reset progress counter
            currentZipIndex = 0;
            progressCounter.textContent = `0/${totalZipCount}`;
            
            logMessage("=====================================================================", true);
            logMessage(`'${sourceDirectoryHandle.name}' klasöründeki tüm ZIP dosyalarının '${destDirectoryHandle.name}' klasörüne çıkarılması başlıyor...`);
            logMessage("=====================================================================", true);
            
            // Create category folders first
            logMessage("Kategori klasörleri oluşturuluyor...");
            await createCategoryFolders();
            
            // Find all ZIP files
            const zipFiles = await findAllZipFiles(sourceDirectoryHandle);
            totalZipCount = zipFiles.length;
            
            if (zipFiles.length === 0) {
                logMessage("Kaynak klasörde ZIP dosyası bulunamadı.");
                progressCounter.textContent = `0/0`;
            } else {
                logMessage(`${zipFiles.length} adet ZIP dosyası bulundu. Çıkarma işlemi başlıyor...`);
                
                for (let i = 0; i < zipFiles.length; i++) {
                    currentZipIndex = i + 1;
                    // Update progress counter
                    progressCounter.textContent = `${currentZipIndex}/${totalZipCount}`;
                    
                    const zipFile = zipFiles[i];
                    logMessage(`İşleniyor (${currentZipIndex}/${totalZipCount}): ${zipFile.path}`, true);
                    
                    const success = await extractZipFile(zipFile);
                    
                    if (success) {
                        logMessage(`"${zipFile.path}" hedef klasöre çıkarıldı`);
                    }
                    logMessage("---------------------------------------------------");
                }
            }
            
            // Now process XLSX files
            logMessage("XLSX dosyaları işleniyor...");
            const xlsxFiles = await findAllXlsxFiles(sourceDirectoryHandle);
            
            if (xlsxFiles.length > 0) {
                logMessage(`${xlsxFiles.length} adet XLSX dosyası bulundu. Taşıma işlemi başlıyor...`);
                
                for (const xlsxFile of xlsxFiles) {
                    logMessage(`Taşınıyor: ${xlsxFile.path}`);
                    
                    const success = await moveXlsxFile(xlsxFile);
                    
                    if (success) {
                        logMessage(`"${xlsxFile.path}" hedef klasöre taşındı`);
                    }
                }
            } else {
                logMessage("Kaynak klasörde XLSX dosyası bulunamadı.");
            }
            
            logMessage("=====================================================================", true);
            logMessage("Çıkarma işlemi tamamlandı!");
            logMessage(`Tüm ZIP dosyaları hedef klasöre çıkarıldı ve kategorilere ayrıldı`);
            logMessage(`XLSX dosyaları da kategorilere göre yerleştirildi`);
            logMessage("=====================================================================", true);
            statusDisplay.textContent = "Tamamlandı!";
            
        } catch (error) {
            logMessage(`Çıkarma işlemi sırasında hata: ${error.message}`);
            statusDisplay.textContent = "Hata oluştu!";
        } finally {
            // Re-enable buttons
            selectSrcBtn.disabled = false;
            selectDstBtn.disabled = false;
            extractBtn.disabled = false;
        }
    }

    // Function to disable all buttons
    function disableButtons() {
        selectSrcBtn.disabled = true;
        selectDstBtn.disabled = true;
        extractBtn.disabled = true;
    }

    // Function to count ZIP files in source folder
    async function updateZipFileCount() {
        if (!sourceDirectoryHandle) return;
        
        try {
            const zipFiles = await findAllZipFiles(sourceDirectoryHandle);
            totalZipCount = zipFiles.length;
            zipCounter.textContent = `ZIP sayısı: ${totalZipCount}`;
            
            // Reset progress counter
            progressCounter.textContent = `0/${totalZipCount}`;
        } catch (error) {
            console.error('ZIP dosyaları sayılırken hata:', error);
            zipCounter.textContent = 'ZIP sayısı: Hata!';
        }
    }
    
    // Function to check if destination folder is empty
    async function checkIfFolderEmpty() {
        if (!destDirectoryHandle) return;
        
        try {
            let isEmpty = true;
            // Try to get the first entry in the folder
            for await (const entry of destDirectoryHandle.values()) {
                isEmpty = false;
                break;
            }
            
            if (!isEmpty) {
                folderWarning.textContent = 'Bu klasör boş değil!';
                folderWarning.classList.remove('hidden');
            } else {
                folderWarning.classList.add('hidden');
            }
        } catch (error) {
            console.error('Klasör içeriği kontrol edilirken hata:', error);
        }
    }
});
