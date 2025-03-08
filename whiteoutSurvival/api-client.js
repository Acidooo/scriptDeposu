document.addEventListener('DOMContentLoaded', function() {
    // Constants from Python script
    const URL = "https://wos-giftcode-api.centurygame.com/api";
    const SALT = "tB87#kPtkxqOS2";
    const HTTP_HEADER = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    };

    // DOM Elements
    const accountIdsInput = document.getElementById('accountIds');
    const giftCodeInput = document.getElementById('giftCode');
    const activateBtn = document.getElementById('activateBtn');
    const statusElement = document.getElementById('status');
    const logElement = document.getElementById('log');

    // Event Listeners
    activateBtn.addEventListener('click', processAccounts);

    // Main function to process all accounts
    async function processAccounts() {
        clearLog();
        const accountIds = accountIdsInput.value
            .split(',')
            .map(id => id.trim())
            .filter(id => id);
            
        const giftCode = giftCodeInput.value.trim();

        if (!accountIds.length) {
            updateLog("Please enter at least one account ID");
            updateStatus("Error: No account IDs provided");
            return;
        }

        if (!giftCode) {
            updateLog("Please enter a gift code");
            updateStatus("Error: No gift code provided");
            return;
        }

        updateStatus(`Processing ${accountIds.length} accounts...`);
        
        // Process each account sequentially
        for (const accountId of accountIds) {
            updateLog(`Processing account ID: ${accountId}`);
            
            try {
                // First get player info
                const playerInfo = await getPlayerInfo(accountId);
                updateLog("**PLAYER INFO**");
                updateLog(JSON.stringify(playerInfo, null, 2));
                
                // Then activate the gift code
                const giftResult = await activateGiftCode(accountId, giftCode);
                updateLog("**GIFT CODE**");
                updateLog(JSON.stringify(giftResult, null, 2));
                
                // Add separator between accounts
                updateLog("*************************************************");
                updateLog("*************************************************");
            } catch (error) {
                updateLog(`Error processing account ${accountId}: ${error.message}`);
            }
            
            // Small delay between accounts
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        updateStatus("Processing complete!");
    }

    // Get player info from API
    async function getPlayerInfo(fid) {
        const timestamp = Date.now() * 1000000; // Nanoseconds similar to Python's time.time_ns()
        
        // Prepare request data
        const requestData = new URLSearchParams();
        requestData.append("fid", fid);
        requestData.append("time", timestamp);
        
        // Calculate sign using MD5 hash
        const signString = `fid=${fid}&time=${timestamp}${SALT}`;
        const sign = CryptoJS.MD5(signString).toString();
        requestData.append("sign", sign);
        
        // Make API call
        const response = await fetch(`${URL}/player`, {
            method: 'POST',
            headers: HTTP_HEADER,
            body: requestData
        });
        
        return await response.json();
    }

    // Activate gift code for an account
    async function activateGiftCode(fid, giftCode) {
        const timestamp = Date.now() * 1000000; // Nanoseconds
        
        // Prepare request data
        const requestData = new URLSearchParams();
        requestData.append("fid", fid);
        requestData.append("time", timestamp);
        requestData.append("cdk", giftCode);
        
        // Calculate sign using MD5 hash
        const signString = `cdk=${giftCode}&fid=${fid}&time=${timestamp}${SALT}`;
        const sign = CryptoJS.MD5(signString).toString();
        requestData.append("sign", sign);
        
        // Make API call
        const response = await fetch(`${URL}/gift_code`, {
            method: 'POST',
            headers: HTTP_HEADER,
            body: requestData
        });
        
        return await response.json();
    }

    // Helper functions for UI updates
    function updateStatus(message) {
        statusElement.textContent = message;
    }
    
    function updateLog(message) {
        const logEntry = document.createElement('pre');
        logEntry.textContent = message;
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
    }
    
    function clearLog() {
        logElement.innerHTML = '';
    }
});
