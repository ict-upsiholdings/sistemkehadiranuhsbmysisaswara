// Add at top of your script
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache helper
function getCachedData(key) {
    const cached = localStorage.getItem(key);
    const timestamp = localStorage.getItem(`${key}_time`);
    
    if (cached && timestamp && (Date.now() - parseInt(timestamp) < CACHE_DURATION)) {
        return JSON.parse(cached);
    }
    return null;
}

function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}_time`, Date.now().toString());
}

// Updated loadSessionData with caching
async function loadSessionData() {
    try {
        // Try cache first
        const cached = getCachedData('sessionData');
        if (cached) {
            console.log('Using cached session data');
            sessionData = cached;
            initializeForm();
            return;
        }
        
        console.log('Loading session data from:', SESSION_API);
        const response = await fetch(SESSION_API, {
            method: 'GET',
            redirect: 'follow'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Session data loaded:', data);

        sessionData = data; // Already in object format from new API
        setCachedData('sessionData', sessionData);
        
        initializeForm();
    } catch (error) {
        console.error('Error loading session data:', error);
        showError('Ralat memuatkan data sesi. Sila hubungi pentadbir.');
    }
}

// Lazy load names only when user types
async function setupNameAutocomplete() {
    const namaInput = document.getElementById('namaInput');
    const dropdown = document.getElementById('nameDropdown');
    const trainerSelect = document.getElementById('trainer');
    let selectedIndex = -1;
    let debounceTimer;

    namaInput.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        
        clearTimeout(debounceTimer);
        
        if (searchTerm.length < 2) {
            dropdown.classList.remove('show');
            return;
        }

        // Debounce search
        debounceTimer = setTimeout(async () => {
            await searchNames(searchTerm);
        }, 300);
    });

    async function searchNames(term) {
        try {
            // Try cache first for exact term
            const cacheKey = `names_${term.toLowerCase()}`;
            let filtered = getCachedData(cacheKey);
            
            if (!filtered) {
                // Check if we have full names list cached
                let allNames = getCachedData('namesData');
                
                if (!allNames) {
                    // Fetch from server with search
                    const response = await fetch(`${NAMES_API}?search=${encodeURIComponent(term)}`);
                    filtered = await response.json();
                } else {
                    // Filter locally
                    const searchLower = term.toLowerCase();
                    filtered = allNames
                        .filter(item => item.Nama.toLowerCase().includes(searchLower))
                        .slice(0, 10);
                }
                
                setCachedData(cacheKey, filtered);
            }

            displayNameDropdown(filtered);
        } catch (error) {
            console.error('Error searching names:', error);
        }
    }

    function displayNameDropdown(filtered) {
        if (filtered.length === 0) {
            dropdown.innerHTML = `<div class="add-new-name">✓ Tambah nama baru: "${namaInput.value}"</div>`;
            dropdown.classList.add('show');
            isCustomName = true;
            trainerSelect.value = '';
            trainerSelect.disabled = false;
        } else {
            let html = '';
            filtered.forEach((item, index) => {
                html += `<div class="name-option" data-index="${index}" data-name="${item.Nama}" data-trainer="${item['Trainer/Trainee']}">
                    ${item.Nama} <span class="category">(${item['Trainer/Trainee']})</span>
                </div>`;
            });
            dropdown.innerHTML = html;
            dropdown.classList.add('show');
            isCustomName = false;
            selectedIndex = -1;
        }
    }
    
    // Rest of autocomplete code...
}

// Updated duplicate check - use API instead of loading all data
async function checkDuplicate(nama, sesi) {
    try {
        const response = await fetch(
            `${API_ENDPOINT}?action=checkDuplicate&nama=${encodeURIComponent(nama)}&sesi=${sesi}`
        );
        const result = await response.json();
        return result.exists ? result : null;
    } catch (error) {
        console.error('Error checking duplicate:', error);
        return null;
    }
}

// Remove loadAttendanceData() from initial load
// Only call when submitting
document.getElementById('attendanceForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    const nama = document.getElementById('namaInput').value.trim();
    const sesi = document.getElementById('sesi').value;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Memeriksa...<span class="loading-spinner"></span>';
    
    // Check duplicate via API
    const duplicate = await checkDuplicate(nama, sesi);
    if (duplicate) {
        showMessage(`⚠️ Kehadiran untuk "${nama}" di Sesi ${sesi} sudah direkodkan!`, 'warning');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }
    
    submitBtn.innerHTML = 'Menghantar<span class="loading-spinner"></span>';
    
    // Continue with submission...
    // (rest of your submit code)
});

// Remove this line from DOMContentLoaded:
// await loadAttendanceData(); // ❌ REMOVE THIS