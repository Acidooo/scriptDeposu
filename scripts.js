// Tool name mapping - add descriptions here
const toolDescriptions = {
    "bifi_web": {
        title: "Bifi Tarih Filtreli",
        description: "Bifi dosyaları için tarih filtreleme aracı"
    },
    "extract_zip_web": {
        title: "Çoklu ZIP Çıkartma",
        description: "ZIP dosyalarını çıkartma aracı"
    },
    "parkoran_sono_csv_sort": {
        title: "SONO WORKSPACE CSV Sıralama",
        description: "CSV dosyalarını düzenleme ve sıralama aracı"
    },
    "okuma_web": {
        title: "Okuma Raporu Birleştir", 
        description: "Okuma raporlarını tek dosyada birleştirir"
    },
    "whiteoutSurvival": {
        title: "WhiteOut Survival Kod",
        description: "WhiteOut Survival hediye kodları için araç"
    }
};

const list = document.getElementById("site-list");
const loader = document.getElementById("loader");

// Simplified function to get tool directories - no API calls
async function detectDirectories() {
    // Simply return the predefined list of tools
    return Object.keys(toolDescriptions);
}

// Function to create a card for each directory
function createCard(folder) {
    const tool = toolDescriptions[folder] || { 
        title: folder.charAt(0).toUpperCase() + folder.slice(1).replace(/_/g, ' '),
        description: "Tool directory"
    };
    
    const a = document.createElement("a");
    a.href = `./${folder}/`;
    a.className = "card";
    a.innerHTML = `
        ${tool.title}
        <span class="tool-description">${tool.description}</span>
    `;
    list.appendChild(a);
}

// Load directories and generate cards
async function loadDirectories() {
    try {
        const directories = await detectDirectories();
        
        if (directories.length === 0) {
            throw new Error("No directories found");
        }
        
        // Create cards for each directory
        directories.forEach(folder => createCard(folder));
        
    } catch (error) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "error";
        errorDiv.textContent = `Error loading directories: ${error.message}`;
        list.appendChild(errorDiv);
    } finally {
        // Hide the loader
        loader.style.display = "none";
    }
}

// Start loading when page is ready
document.addEventListener('DOMContentLoaded', loadDirectories);
