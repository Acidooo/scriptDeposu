// Tool name mapping with categories added
const toolDescriptions = {
    // This is a json construction for tool descriptions
    
    "bifi_web": {// this one is actual folder name
        title: "Bifi_Reading Tarih Filtreli",
        description: "Bifi dosyaları için tarih filtreleme aracı",
        category: "file"
    },
    "extract_zip_web": {
        title: "Eryaman Çoklu ZIP Çıkartma",
        description: "ZIP dosyalarını ayıklama aracı",
        category: "file"
    },
    "parkoran_sono_csv_sort": {
        title: "Sono Workspace CSV Sıralama",
        description: "CSV dosyalarını düzenleme ve sıralama aracı",
        category: "data"
    },
    "okuma_web": {
        title: "Okuma Raporu Birleştir", 
        description: "Okuma raporlarını tek dosyada birleştirir",
        category: "data"
    },
    "whiteoutSurvival": {
        title: "WOS",
        description: "WOS",
        category: "utility"
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
        description: "Tool directory",
        category: "utility"
    };
    
    const a = document.createElement("a");
    a.href = `./${folder}/`;
    a.className = "card";
    a.dataset.category = tool.category || "utility";
    a.innerHTML = `
        ${tool.title}
        <span class="tool-description">${tool.description}</span>
    `;
    list.appendChild(a);
}

// Initialize search and filters
function initializeFilters() {
    const searchInput = document.getElementById('toolSearch');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const cards = document.querySelectorAll('.card');
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        cards.forEach(card => {
            const title = card.textContent.toLowerCase();
            const isVisible = title.includes(searchTerm);
            card.style.display = isVisible ? 'flex' : 'none';
        });
    });
    
    // Category filter functionality
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Toggle active class
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter cards
            cards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// Theme toggle functionality
function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeToggle.classList.add('light-mode');
    }
    
    // Toggle theme on click
    themeToggle.addEventListener('click', function() {
        body.classList.toggle('light-mode');
        themeToggle.classList.toggle('light-mode');
        
        // Save preference
        const currentTheme = body.classList.contains('light-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
    });
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
        
        // Initialize search and filters after cards are created
        initializeFilters();
        initializeThemeToggle();
        
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
