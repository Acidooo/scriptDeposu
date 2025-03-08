// Tool name mapping - add descriptions here
const toolDescriptions = {
    "bifi_web": {
        title: "Bifi Tarih Filtreli",
        description: "Tarih filtreleme için Bifi aracı"
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

// Function to detect if we're on GitHub Pages or local
function isGitHubPages() {
    return window.location.hostname.includes('github.io');
}

// Function to get the repository name from the URL
function getRepoName() {
    if (isGitHubPages()) {
        // Extract repo name from github.io URL
        const pathParts = window.location.pathname.split('/');
        return pathParts[1]; // Usually the first path component is the repo name
    }
    return null;
}

// Function to automatically detect available directories using GitHub REST API
async function detectDirectories() {
    try {
        // Use predefined list as fallback
        let directories = Object.keys(toolDescriptions);
        
        if (isGitHubPages()) {
            try {
                // Extract username and repository name from the URL
                const username = window.location.hostname.split('.')[0];
                const repoName = getRepoName();
                
                if (!repoName) {
                    throw new Error("Could not determine repository name");
                }
                
                // Using GitHub REST API directly (no authentication needed for public repos)
                const apiUrl = `https://api.github.com/repos/${username}/${repoName}/contents/`;
                console.log(`Fetching directories from: ${apiUrl}`);
                
                const response = await fetch(apiUrl, {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Filter for directories only
                const apiDirectories = data
                    .filter(item => item.type === 'dir')
                    .map(item => item.name);
                    
                if (apiDirectories.length > 0) {
                    directories = apiDirectories;
                    console.log("Successfully detected directories:", directories);
                }
            } catch (apiError) {
                console.warn("GitHub API error:", apiError.message);
                // Continue using the default directories list
            }
        }
        
        return directories;
    } catch (error) {
        console.error("Error detecting directories:", error);
        return Object.keys(toolDescriptions); // Fallback to predefined list
    }
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
