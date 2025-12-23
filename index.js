const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const weatherInfoDiv = document.getElementById('weather-info');
const coordsDisplay = document.getElementById('coordsDisplay');
const citySearchInput = document.getElementById('city-search');
const searchButton = document.getElementById('search-button');
const searchResultsDiv = document.getElementById('search-results');
let marker;
let currentLat = null;
let currentLon = null;

// --- Weather Code Mapping (WMO) ---
// Ref: https://open-meteo.com/en/docs#weathervariables
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
        case 95: return { desc: "Thunderstorm", icon: " thunderstorms" };
        case 96: return { desc: "Thunderstorm with slight hail", icon: "⛈️🧊" };
        case 99: return { desc: "Thunderstorm with heavy hail", icon: "⛈️🧊" };
        default: return { desc: "Unknown", icon: "❓" };
    }
}

// Function to format API date string (e.g., "2023-10-27T05:00") to locale time string
function formatTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
        console.error("Error formatting time:", e);
        return 'Invalid Time';
    }
}
// Function to format API date string ("YYYY-MM-DD") to locale date string
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString + 'T00:00:00'); // Ensure it's parsed as local date
        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) {
        console.error("Error formatting date:", e);
        return 'Invalid Date';
    }
}

// Function to fetch and display weather
function fetchWeather(lat, lon, placeName = null) {
    currentLat = lat; // Store lat/lon for the details link
    currentLon = lon;

    weatherInfoDiv.innerHTML = '<h3>Weather Information</h3><p>Loading...</p>';
    weatherInfoDiv.classList.add('loading');
    coordsDisplay.textContent = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;

    // Add/Move marker
    if (marker) {
        map.removeLayer(marker);
    }
    marker = L.marker([lat, lon]).addTo(map);
    const popupContent = placeName ? `${placeName}<br>(${lat.toFixed(4)}, ${lon.toFixed(4)})` : `Selected: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    marker.bindPopup(popupContent).openPopup();

    // Construct URL for Open-Meteo API
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max&timezone=auto`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                // Try to parse error from JSON response body
                return response.json().then(errData => {
                    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
                }).catch(() => {
                    // Fallback if response body is not JSON or parsing fails
                    throw new Error(`HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            weatherInfoDiv.classList.remove('loading');
            if (data.error) {
                weatherInfoDiv.innerHTML = `<h3>Weather Information</h3><p class="error">Error: ${data.error}</p><div class="coords">Selected Coordinates: <span id="coordsDisplay">Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</span></div>`;
            } else if (data.current) {
                try {
                    const current = data.current;
                    const weather = getWeatherDescriptionAndIcon(current.weather_code);

                    // --- HTML with Inner Grid --- 
                    let html = `
                    <h3>${placeName || 'Current Weather'}</h3>
                    <p><span class="weather-icon">${weather.icon}</span> ${weather.desc}</p>
                    
                    <div class="details-grid">
                        <div class="data-point">
                            <div class="data-label">Temperature</div>
                            <div class="data-value">${current.temperature_2m !== null && current.temperature_2m !== undefined ? current.temperature_2m + ' °C' : 'N/A'}</div>
                        </div>
                            <div class="data-point">
                            <div class="data-label">Feels Like</div>
                            <div class="data-value">${current.apparent_temperature !== null && current.apparent_temperature !== undefined ? current.apparent_temperature + ' °C' : 'N/A'}</div>
                        </div>
                            <div class="data-point">
                            <div class="data-label">Humidity</div>
                            <div class="data-value">${current.relative_humidity_2m !== null && current.relative_humidity_2m !== undefined ? current.relative_humidity_2m + ' %' : 'N/A'}</div>
                        </div>
                        <div class="data-point">
                            <div class="data-label">Wind Speed</div>
                            <div class="data-value">${current.wind_speed_10m !== null && current.wind_speed_10m !== undefined ? current.wind_speed_10m + ' km/h' : 'N/A'}</div>
                        </div>
                `;

                    // Add Sunrise/Sunset if available from daily data
                    if (data.daily && data.daily.sunrise && data.daily.sunrise.length > 0 && data.daily.sunset && data.daily.sunset.length > 0) {
                        html += `
                        <div class="data-point">
                            <div class="data-label">Sunrise</div>
                            <div class="data-value">${formatTime(data.daily.sunrise[0])}</div>
                        </div>
                        <div class="data-point">
                            <div class="data-label">Sunset</div>
                            <div class="data-value">${formatTime(data.daily.sunset[0])}</div>
                        </div>
                    `;
                    }

                    html += `</div>`; // Close details-grid

                    // Add Last Updated time
                    html += `<p style="margin-top: 1em; font-size: 0.9em; color: var(--muted-text-color); text-align: center;">Last updated: ${formatTime(current.time)}</p>`;
                    // --- END HTML --- 

                    // Add "Know More" Link Container
                    html += `<div class="details-link-container">
                            <a href="details.html?lat=${currentLat}&lon=${currentLon}" target="_blank" id="details-link">Know More...</a>
                            </div>`;

                    html += `<div class="coords">Selected Coordinates: <span id="coordsDisplay">Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</span></div>`;
                    weatherInfoDiv.innerHTML = html;
                } catch (renderError) {
                    console.error("Rendering error:", renderError);
                    weatherInfoDiv.innerHTML = `<h3>Weather Information</h3><p class="error">Error rendering data: ${renderError.message}</p><div class="coords">Selected Coordinates: <span id="coordsDisplay">Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</span></div>`;
                }

            } else {
                weatherInfoDiv.innerHTML = `<h3>Weather Information</h3><p class="error">Received data, but weather details are missing.</p><div class="coords">Selected Coordinates: <span id="coordsDisplay">Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</span></div>`;
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            weatherInfoDiv.classList.remove('loading');
            weatherInfoDiv.innerHTML = `<h3>Weather Information</h3><p class="error">Failed to fetch weather data. ${error.message}</p><div class="coords">Selected Coordinates: <span id="coordsDisplay">Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</span></div>`;
        });
}

// --- City Search Logic ---
function searchCity() {
    const cityName = citySearchInput.value.trim();
    if (!cityName) {
        searchResultsDiv.innerHTML = ''; // Clear results if input is empty
        return;
    }

    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=en&format=json`;
    searchResultsDiv.innerHTML = '<ul><li>Searching...</li></ul>'; // Indicate searching

    fetch(geocodeUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Geocoding error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            searchResultsDiv.innerHTML = ''; // Clear previous results/loading
            if (data.results && data.results.length > 0) {
                const resultsList = document.createElement('ul');
                data.results.forEach(city => {
                    const li = document.createElement('li');
                    let regionInfo = [city.admin1, city.country].filter(Boolean).join(', '); // Combine admin1 and country
                    li.innerHTML = `${city.name} <span class="city-region">(${regionInfo})</span>`;
                    li.dataset.lat = city.latitude;
                    li.dataset.lon = city.longitude;
                    li.dataset.name = `${city.name}, ${city.country_code}`; // For display
                    li.addEventListener('click', handleCitySelection);
                    resultsList.appendChild(li);
                });
                searchResultsDiv.appendChild(resultsList);
            } else {
                searchResultsDiv.innerHTML = '<ul><li>No cities found.</li></ul>';
            }
        })
        .catch(error => {
            console.error('Geocoding fetch error:', error);
            searchResultsDiv.innerHTML = `<ul><li style="color: red;">Error searching cities: ${error.message}</li></ul>`;
        });
}

function handleCitySelection(event) {
    const selectedLi = event.currentTarget;
    const lat = parseFloat(selectedLi.dataset.lat);
    const lon = parseFloat(selectedLi.dataset.lon);
    const name = selectedLi.dataset.name;

    if (!isNaN(lat) && !isNaN(lon)) {
        map.setView([lat, lon], 10); // Zoom into the city
        fetchWeather(lat, lon, name); // Fetch weather for the selected city
        searchResultsDiv.innerHTML = ''; // Clear search results
        citySearchInput.value = ''; // Clear search input
    } else {
        console.error('Invalid coordinates for selected city', selectedLi.dataset);
    }
}

searchButton.addEventListener('click', searchCity);
// Optional: Trigger search on Enter key press in the input field
citySearchInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        searchCity();
    }
});
// -----------------------

// Add a click event listener to the map
map.on('click', function (e) {
    const lat = e.latlng.lat;
    let lon = e.latlng.lng;

    // Normalize longitude to -180 to 180
    lon = ((lon + 180) % 360 + 360) % 360 - 180;

    searchResultsDiv.innerHTML = ''; // Clear search results on map click
    citySearchInput.value = ''; // Clear search input
    fetchWeather(lat, lon); // Fetch weather for clicked coordinates
});

// --- Geolocation Logic ---
function initializeWithCurrentLocation() {
    if ("geolocation" in navigator) {
        weatherInfoDiv.innerHTML = '<h3>Weather Information</h3><p>Locating you...</p>';
        weatherInfoDiv.classList.add('loading');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // Update map view and fetch weather
                map.setView([lat, lon], 10);
                fetchWeather(lat, lon, "Your Location");
            },
            (error) => {
                console.error("Geolocation error:", error);
                weatherInfoDiv.classList.remove('loading');
                weatherInfoDiv.innerHTML = '<h3>Weather Information</h3><p>Could not get your location. Click on the map or search for a city.</p>';
            }
        );
    } else {
        console.log("Geolocation not available");
    }
}

// Initialize
initializeWithCurrentLocation();
