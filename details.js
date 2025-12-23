// --- Utility Functions --- //
// (Keep existing getWeatherDescriptionAndIcon, formatTime, formatDate)
function getWeatherDescriptionAndIcon(code) {
    switch (code) {
        case 0: return { desc: "Clear sky", icon: "☀️" };
        case 1: return { desc: "Mainly clear", icon: "🌤️" };
        case 2: return { desc: "Partly cloudy", icon: "⛅" };
        case 3: return { desc: "Overcast", icon: "☁️" };
        case 45: return { desc: "Fog", icon: "🌫️" };
        case 48: return { desc: "Depositing rime fog", icon: "🌫️" };
        case 51: return { desc: "Light drizzle", icon: "🌦️" };
        case 53: return { desc: "Moderate drizzle", icon: "🌦️" };
        case 55: return { desc: "Dense drizzle", icon: "🌦️" };
        case 56: return { desc: "Light freezing drizzle", icon: "🥶" };
        case 57: return { desc: "Dense freezing drizzle", icon: "🥶" };
        case 61: return { desc: "Slight rain", icon: "🌧️" };
        case 63: return { desc: "Moderate rain", icon: "🌧️" };
        case 65: return { desc: "Heavy rain", icon: "🌧️" };
        case 66: return { desc: "Light freezing rain", icon: "🥶🌧️" };
        case 67: return { desc: "Heavy freezing rain", icon: "🥶🌧️" };
        case 71: return { desc: "Slight snow fall", icon: "🌨️" };
        case 73: return { desc: "Moderate snow fall", icon: "🌨️" };
        case 75: return { desc: "Heavy snow fall", icon: "🌨️" };
        case 77: return { desc: "Snow grains", icon: "🌨️" };
        case 80: return { desc: "Slight rain showers", icon: "🌦️" };
        case 81: return { desc: "Moderate rain showers", icon: "🌦️" };
        case 82: return { desc: "Violent rain showers", icon: "⛈️" };
        case 85: return { desc: "Slight snow showers", icon: "🌨️" };
        case 86: return { desc: "Heavy snow showers", icon: "🌨️" };
        case 95: return { desc: "Thunderstorm", icon: " thunderstorms" }; // Note: Typo in original?
        case 96: return { desc: "Thunderstorm with slight hail", icon: "⛈️🧊" };
        case 99: return { desc: "Thunderstorm with heavy hail", icon: "⛈️🧊" };
        default: return { desc: "Unknown", icon: "❓" };
    }
}
function formatTime(isoString, options = { hour: 'numeric', minute: '2-digit', hour12: true }) {
    if (!isoString) return 'N/A';
    try { return new Date(isoString).toLocaleTimeString([], options); }
    catch (e) { console.error("Time Format Error:", e); return 'Invalid'; }
}
function formatDate(dateString, options = { weekday: 'short', month: 'short', day: 'numeric' }) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString + 'T00:00:00'); // Treat as local date
        return date.toLocaleDateString([], options);
    } catch (e) { console.error("Date Format Error:", e); return 'Invalid'; }
}

// --- DOM Elements --- //
const weatherWrapperDiv = document.getElementById('weather-details-wrapper');
const weatherContentDiv = document.getElementById('weather-content');
const locationDisplayP = document.getElementById('location-display');
const mapDivId = 'details-map';
const printButton = document.getElementById('print-button');
const shareButton = document.getElementById('share-button');
let locationName = ''; // Will store location name if we can reverse geocode
let map = null; // Map instance for the main details view
let currentWeatherData = null; // Store fetched data

// --- Overlay Elements & Map Instance --- //
const detailsMapDiv = document.getElementById(mapDivId); // The small map
const mapOverlay = document.getElementById('map-overlay');
const closeMapOverlayButton = document.getElementById('close-map-overlay');
const overlayMapDivId = 'overlay-map';
const overlayCitySearchInput = document.getElementById('overlay-city-search');
const overlaySearchButton = document.getElementById('overlay-search-button');
const overlaySearchResultsDiv = document.getElementById('overlay-search-results');
let overlayMapInstance = null; // Instance for the overlay map
let currentMapLat = null;
let currentMapLon = null;

// --- Initialization --- //
function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const latParam = urlParams.get('lat');
    const lonParam = urlParams.get('lon');

    if (latParam && lonParam) {
        const lat = parseFloat(latParam);
        const lon = parseFloat(lonParam);

        if (!isNaN(lat) && !isNaN(lon)) {
            // Normalize longitude to -180 to 180
            const normalizedLon = ((lon + 180) % 360 + 360) % 360 - 180;

            locationDisplayP.textContent = `Location: Lat ${lat.toFixed(4)}, Lon ${normalizedLon.toFixed(4)}`;
            currentMapLat = lat; // Store initial coordinates
            currentMapLon = normalizedLon;
            initializeMap(lat, normalizedLon); // Initialize small map
            fetchDetailedWeather(lat, normalizedLon);
            fetchLocationName(lat, normalizedLon);
        } else {
            showError("Invalid latitude or longitude provided.");
        }
    } else {
        showError("Latitude and longitude not provided in URL.");
    }

    // Add event listeners for buttons
    printButton.addEventListener('click', () => window.print());
    shareButton.addEventListener('click', shareLocation);

    // --- Overlay Event Listeners ---
    detailsMapDiv.addEventListener('click', openMapOverlay);
    closeMapOverlayButton.addEventListener('click', closeMapOverlay);
    overlaySearchButton.addEventListener('click', searchOverlayCity);
    overlayCitySearchInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            searchOverlayCity();
        }
    });
}

// --- Map --- //
function initializeMap(lat, lon) {
    if (map) { map.remove(); } // Remove previous map if exists
    map = L.map(mapDivId).setView([lat, lon], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    L.marker([lat, lon]).addTo(map)
        .bindPopup(`Selected Location`) // Simple popup
        .openPopup();
}

// --- Data Fetching --- //
function fetchLocationName(lat, lon) {
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1&format=json`;
    fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                const place = data.results[0];
                locationName = place.name;
                const regionInfo = [place.admin1, place.country].filter(Boolean).join(', ');
                locationDisplayP.textContent = `${place.name}${regionInfo ? ', ' + regionInfo : ''}`;
            }
        })
        .catch(error => console.error("Error fetching location name:", error));
}

function fetchDetailedWeather(lat, lon) {
    // Construct URL for Open-Meteo API
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,pressure_msl,surface_pressure,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&timezone=auto`;
    // NOTE: Using direct API call

    weatherContentDiv.innerHTML = `<div class="loading-message">Fetching weather data...</div>`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(errData.reason || `API Error: ${response.status}`);
                }).catch(() => { throw new Error(`API Error: ${response.status}`); });
            }
            return response.json();
        })
        .then(data => {
            currentWeatherData = data; // Store data
            renderWeatherUI(data);
        })
        .catch(error => {
            console.error("Fetch Detailed Weather Error:", error);
            showError(`Failed to fetch detailed weather: ${error.message}. Please check your internet connection.`);
        });
}

// --- UI Rendering --- //
function renderWeatherUI(data) {
    if (!data || !data.current || !data.hourly || !data.daily) {
        showError("Incomplete weather data received.");
        return;
    }

    // Clear loading message
    weatherContentDiv.innerHTML = '';

    // Create Tabs
    const tabsHtml = `
        <ul class="tabs-nav">
            <li><button class="tab-button active" data-tab="current">Current</button></li>
            <li><button class="tab-button" data-tab="hourly">Hourly</button></li>
            <li><button class="tab-button" data-tab="daily">7-Day</button></li>
        </ul>`;
    weatherWrapperDiv.insertAdjacentHTML('afterbegin', tabsHtml);

    // Create Tab Content Containers
    weatherContentDiv.innerHTML = `
        <div class="tab-content active" id="current-tab-content">
            ${renderCurrentWeather(data.current, data.current_units)}
        </div>
        <div class="tab-content" id="hourly-tab-content">
            ${renderHourlyWeather(data.hourly, data.hourly_units, data.current.time)}
        </div>
        <div class="tab-content" id="daily-tab-content">
            ${renderDailyWeather(data.daily, data.daily_units)}
        </div>`;

    setupTabNavigation();
    initializeCharts(data); // Initialize charts after content is in DOM
}

function renderCurrentWeather(current, units) {
    if (!current || !units) { return '<p class="error">Current weather data or units missing.</p>'; }
    const weather = getWeatherDescriptionAndIcon(current.weather_code);
    let html = `
        <div class="weather-card">
            <div class="card-header">
                <h2>Current Conditions</h2>
                <span>As of ${formatTime(current.time)}</span>
            </div>
            <div class="card-content">
                <div class="current-overview">
                    <div class="current-icon">${weather.icon}</div>
                    <div class="current-temp-details">
                        <div class="temp">${current.temperature_2m ?? 'N/A'}${units.temperature_2m ?? ''}</div>
                        <div class="desc">${weather.desc}</div>
                        <div class="feels-like">Feels like ${current.apparent_temperature ?? 'N/A'}${units.apparent_temperature ?? ''}</div>
                    </div>
                </div>
                <div class="details-grid">
                    <div class="data-point">
                        <div class="data-label">Humidity</div>
                        <div class="data-value">${current.relative_humidity_2m ?? 'N/A'}${units.relative_humidity_2m ?? ''}</div>
                    </div>
                    <div class="data-point">
                        <div class="data-label">Wind</div>
                        <div class="data-value">${current.wind_speed_10m ?? 'N/A'} ${units.wind_speed_10m ?? ''}</div>
                    </div>
                    <div class="data-point">
                        <div class="data-label">Wind Direction</div>
                        <div class="data-value">${current.wind_direction_10m ?? 'N/A'}°</div>
                    </div>
                    <div class="data-point">
                        <div class="data-label">Pressure</div>
                        <div class="data-value">${current.surface_pressure ?? 'N/A'} ${units.surface_pressure ?? ''}</div>
                    </div>
                        <div class="data-point">
                        <div class="data-label">Precipitation</div>
                        <div class="data-value">${current.precipitation ?? 'N/A'} ${units.precipitation ?? ''}</div>
                    </div>
                    <div class="data-point">
                        <div class="data-label">Cloud Cover</div>
                        <div class="data-value">${current.cloud_cover ?? 'N/A'} ${units.cloud_cover ?? ''}</div>
                    </div>
                        ${current.rain !== undefined ? `<div class="data-point">
                        <div class="data-label">Rain</div>
                        <div class="data-value">${current.rain ?? 'N/A'} ${units.rain ?? ''}</div>
                    </div>` : ''}
                    ${current.showers !== undefined ? `<div class="data-point">
                        <div class="data-label">Showers</div>
                        <div class="data-value">${current.showers ?? 'N/A'} ${units.showers ?? ''}</div>
                    </div>` : ''}
                        ${current.snowfall !== undefined ? `<div class="data-point">
                        <div class="data-label">Snowfall</div>
                        <div class="data-value">${current.snowfall ?? 'N/A'} ${units.snowfall ?? ''}</div>
                    </div>` : ''}
                    ${current.wind_gusts_10m !== undefined ? `<div class="data-point">
                        <div class="data-label">Wind Gusts</div>
                        <div class="data-value">${current.wind_gusts_10m ?? 'N/A'} ${units.wind_gusts_10m ?? ''}</div>
                    </div>` : ''}
                </div>
            </div>
        </div>`;
    return html;
}

function renderHourlyWeather(hourly, units, currentTimeISO) {
    if (!hourly || !units) { return '<p class="error">Hourly weather data or units missing.</p>'; }
    let itemsHtml = '';
    const currentTime = new Date(currentTimeISO);
    let startIndex = hourly.time.findIndex(t => new Date(t) >= currentTime);
    if (startIndex === -1) startIndex = 0; // Fallback

    const hoursToShow = 24;
    for (let i = startIndex; i < startIndex + hoursToShow && i < hourly.time.length; i++) {
        const time = new Date(hourly.time[i]);
        const hour = formatTime(hourly.time[i], { hour: 'numeric', hour12: true });
        const weather = getWeatherDescriptionAndIcon(hourly.weather_code[i]);
        const temp = hourly.temperature_2m[i] !== null ? Math.round(hourly.temperature_2m[i]) + (units.temperature_2m ?? '°') : '-';
        const precipProb = hourly.precipitation_probability[i] !== null ? hourly.precipitation_probability[i] + '%' : '-';

        itemsHtml += `
            <div class="hourly-item">
                <div class="time">${hour}</div>
                <div class="icon">${weather.icon}</div>
                <div class="temp">${temp}</div>
                <div class="precip">💧 ${precipProb}</div>
            </div>`;
    }

    let html = `
        <div class="weather-card">
            <div class="card-header">
                <h2>Hourly Forecast</h2>
                <span>Next ${hoursToShow} Hours</span>
            </div>
            <div class="card-content">
                <div class="hourly-scroll-wrapper">
                    <div class="hourly-forecast-items">
                        ${itemsHtml}
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="hourly-temp-chart"></canvas>
                </div>
            </div>
        </div>`;
    return html;
}

function renderDailyWeather(daily, units) {
    if (!daily || !units) { return '<p class="error">Daily weather data or units missing.</p>'; }
    let itemsHtml = '';
    for (let i = 0; i < daily.time.length; i++) {
        const weather = getWeatherDescriptionAndIcon(daily.weather_code[i]);
        const dateDisplay = i === 0 ? 'Today' : formatDate(daily.time[i], { weekday: 'long' }); // Use full weekday
        const shortDate = formatDate(daily.time[i], { month: 'short', day: 'numeric' });

        itemsHtml += `
            <div class="daily-card">
                <div class="daily-date">
                    <div>${dateDisplay}</div>
                    <div style="font-size: 0.85rem; color: var(--text-light);">${shortDate}</div>
                </div>
                <div class="daily-icon">${weather.icon}</div>
                <div class="daily-temp">
                    <span class="high">${daily.temperature_2m_max[i] ?? '-'}${units.temperature_2m_max ?? '°'}</span>
                    <span class="low">${daily.temperature_2m_min[i] ?? '-'}${units.temperature_2m_min ?? '°'}</span>
                </div>
                <div class="daily-desc">${weather.desc}</div>
                <!-- Add more daily details if needed here -->
            </div>`;
    }

    let html = `
        <div class="weather-card">
            <div class="card-header">
                <h2>${daily.time.length}-Day Forecast</h2>
            </div>
            <div class="card-content">
                <div class="daily-forecast-list">
                    ${itemsHtml}
                </div>
                <div class="chart-container">
                    <canvas id="daily-trend-chart"></canvas>
                </div>
            </div>
        </div>`;
    return html;
}

function setupTabNavigation() {
    const tabButtons = weatherWrapperDiv.querySelectorAll('.tab-button');
    const tabContents = weatherContentDiv.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Deactivate all
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Activate selected
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab-content`).classList.add('active');
        });
    });
}

function initializeCharts(data) {
    if (!data) return;

    // Get computed styles for colors
    const computedStyles = getComputedStyle(document.documentElement);
    const primaryColor = computedStyles.getPropertyValue('--primary-color').trim();
    const borderColor = computedStyles.getPropertyValue('--border-color').trim();
    const primaryColorRgba = `rgba(${parseInt(primaryColor.slice(1, 3), 16)}, ${parseInt(primaryColor.slice(3, 5), 16)}, ${parseInt(primaryColor.slice(5, 7), 16)}, 0.1)`; // Convert hex to rgba for background

    // Hourly Temperature Chart
    const hourlyCtx = document.getElementById('hourly-temp-chart');
    if (hourlyCtx && data.hourly) {
        const hourly = data.hourly;
        const currentTime = new Date(data.current.time);
        let startIndex = hourly.time.findIndex(t => new Date(t) >= currentTime);
        if (startIndex === -1) startIndex = 0;

        const hoursToShow = 24;
        const timeLabels = hourly.time.slice(startIndex, startIndex + hoursToShow).map(t => formatTime(t, { hour: 'numeric', hour12: true }));
        const tempData = hourly.temperature_2m.slice(startIndex, startIndex + hoursToShow);

        new Chart(hourlyCtx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Temperature',
                    data: tempData,
                    borderColor: primaryColor, // Use computed value
                    backgroundColor: primaryColorRgba, // Use computed rgba value
                    tension: 0.4,
                    fill: true,
                    pointRadius: 2,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { title: { display: true, text: 'Temp (°C)' } },
                    x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                }
            }
        });
    }

    // Daily Temperature Trend Chart
    const dailyCtx = document.getElementById('daily-trend-chart');
    if (dailyCtx && data.daily) {
        const daily = data.daily;
        const dateLabels = daily.time.map(d => formatDate(d, { weekday: 'short' })); // Short weekday labels

        new Chart(dailyCtx, {
            type: 'line',
            data: {
                labels: dateLabels,
                datasets: [
                    {
                        label: 'High',
                        data: daily.temperature_2m_max,
                        borderColor: '#ef4444', // Reddish for high
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.3,
                        pointRadius: 3, pointHoverRadius: 6
                    },
                    {
                        label: 'Low',
                        data: daily.temperature_2m_min,
                        borderColor: primaryColor, // Use computed value for low temp line
                        backgroundColor: primaryColorRgba, // Use computed rgba value
                        tension: 0.3,
                        pointRadius: 3, pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { title: { display: true, text: 'Temp (°C)' } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                }
            }
        });
    }
}

function showError(message) {
    // Ensure tabs are removed if they exist
    const tabs = weatherWrapperDiv.querySelector('.tabs-nav');
    if (tabs) tabs.remove();
    weatherContentDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

function shareLocation() {
    const url = window.location.href;
    const title = `Weather details for ${locationName || 'selected location'}`;

    if (navigator.share) {
        navigator.share({ title: title, url: url })
            .then(() => console.log('Shared successfully'))
            .catch((error) => console.error('Share failed:', error));
    } else {
        navigator.clipboard.writeText(url)
            .then(() => alert('Link copied to clipboard!'))
            .catch(err => console.error('Failed to copy link:', err));
    }
}

// --- Overlay Map Functions --- //
function openMapOverlay() {
    mapOverlay.classList.add('active');
    // Initialize map slightly delayed to ensure div is visible and sized
    setTimeout(() => {
        let mapNeedsInitialization = !overlayMapInstance;
        if (mapNeedsInitialization) {
            initializeOverlayMap(currentMapLat, currentMapLon);
        } else {
            overlayMapInstance.setView([currentMapLat, currentMapLon], 11);
        }
        // Invalidate size after initialization or view reset
        if (overlayMapInstance) {
            overlayMapInstance.invalidateSize();
        }
    }, 100); // Increased timeout to 100ms
}

function closeMapOverlay() {
    mapOverlay.classList.remove('active');
    overlaySearchResultsDiv.innerHTML = ''; // Clear results
    overlayCitySearchInput.value = ''; // Clear input
}

function initializeOverlayMap(lat, lon) {
    if (overlayMapInstance) { overlayMapInstance.remove(); }
    overlayMapInstance = L.map(overlayMapDivId).setView([lat, lon], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(overlayMapInstance);

    // Add marker for current location
    L.marker([lat, lon]).addTo(overlayMapInstance)
        .bindPopup('Current selection').openPopup();

    // Add click listener to overlay map
    overlayMapInstance.on('click', function (e) {
        const clickedLat = e.latlng.lat;
        let clickedLon = e.latlng.lng;

        // Normalize longitude to -180 to 180
        clickedLon = ((clickedLon + 180) % 360 + 360) % 360 - 180;

        updatePageLocation(clickedLat, clickedLon);
    });
}

function updatePageLocation(lat, lon) {
    // Construct the new query string
    const newSearch = `?lat=${lat}&lon=${lon}`;
    // Reload the page with the new coordinates
    window.location.search = newSearch;
}

// --- Overlay Search Logic (similar to index.html) ---
function searchOverlayCity() {
    const cityName = overlayCitySearchInput.value.trim();
    if (!cityName) {
        overlaySearchResultsDiv.innerHTML = ''; return;
    }
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`;
    overlaySearchResultsDiv.innerHTML = '<ul><li>Searching...</li></ul>';

    fetch(geocodeUrl)
        .then(response => {
            if (!response.ok) { throw new Error(`Geocoding error! Status: ${response.status}`); }
            return response.json();
        })
        .then(data => {
            overlaySearchResultsDiv.innerHTML = '';
            if (data.results && data.results.length > 0) {
                const resultsList = document.createElement('ul');
                data.results.forEach(city => {
                    const li = document.createElement('li');
                    let regionInfo = [city.admin1, city.country].filter(Boolean).join(', ');
                    li.innerHTML = `${city.name} <span>(${regionInfo})</span>`;
                    li.dataset.lat = city.latitude;
                    li.dataset.lon = city.longitude;
                    li.addEventListener('click', handleOverlayCitySelection);
                    resultsList.appendChild(li);
                });
                overlaySearchResultsDiv.appendChild(resultsList);
            } else {
                overlaySearchResultsDiv.innerHTML = '<ul><li>No cities found.</li></ul>';
            }
        })
        .catch(error => {
            console.error('Overlay Geocoding fetch error:', error);
            overlaySearchResultsDiv.innerHTML = `<ul><li style="color: red;">Error searching: ${error.message}</li></ul>`;
        });
}

function handleOverlayCitySelection(event) {
    const selectedLi = event.currentTarget;
    const lat = parseFloat(selectedLi.dataset.lat);
    const lon = parseFloat(selectedLi.dataset.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
        updatePageLocation(lat, lon);
    } else {
        console.error('Invalid coordinates for selected city', selectedLi.dataset);
    }
}

// --- Start the application --- //
document.addEventListener('DOMContentLoaded', initializePage);
