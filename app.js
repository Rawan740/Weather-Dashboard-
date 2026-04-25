const weatherLookup = {
    0: { desc: "Clear sky", icon: "☀️" },
    1: { desc: "Mainly clear", icon: "🌤️" },
    2: { desc: "Partly cloudy", icon: "⛅" },
    3: { desc: "Overcast", icon: "☁️" },
    45: { desc: "Fog", icon: "🌫️" },
    48: { desc: "Depositing rime fog", icon: "🌫️" },
    51: { desc: "Light drizzle", icon: "🌧️" },
    53: { desc: "Moderate drizzle", icon: "🌧️" },
    55: { desc: "Dense drizzle", icon: "🌧️" },
    61: { desc: "Slight rain", icon: "🌦️" },
    63: { desc: "Moderate rain", icon: "🌧️" },
    65: { desc: "Heavy rain", icon: "🌧️" },
    71: { desc: "Slight snow", icon: "🌨️" },
    73: { desc: "Moderate snow", icon: "❄️" },
    75: { desc: "Heavy snow", icon: "❄️" },
    95: { desc: "Thunderstorm", icon: "⛈️" }
};

// Function to show errors in the UI
function showError(message) {
    const errorBanner = document.getElementById('error-banner');
    errorBanner.textContent = message;
    errorBanner.classList.remove('hidden');
    
    // Stop the skeleton loading animation
    document.querySelectorAll('.skeleton-text').forEach(el => {
        el.classList.remove('skeleton-text');
    });
}

// Function to update the DOM with real data
function updateUI(cityName, weatherData) {
    // 1. Hide errors
    document.getElementById('error-banner').classList.add('hidden');

    // 2. Remove text skeletons in the main card
    document.querySelectorAll('.skeleton-text').forEach(el => el.classList.remove('skeleton-text'));

    // 3. Populate Current Weather Card
    document.getElementById('city-display').textContent = cityName;
    document.querySelector('.temp-main').textContent = `${weatherData.current_weather.temperature}°C`;
    
    const code = weatherData.current_weather.weathercode;
    const weatherInfo = weatherLookup[code] || { desc: "Unknown", icon: "☁️" };
    document.getElementById('weather-desc').textContent = `${weatherInfo.icon} ${weatherInfo.desc}`;

    // Add Humidity and Wind Speed
    // (We pull humidity from the first hour of the hourly array, and windspeed from current_weather)
    const currentHumidity = weatherData.hourly.relativehumidity_2m[0];
    const currentWind = weatherData.current_weather.windspeed;
    document.getElementById('humidity').textContent = `Humidity: ${currentHumidity}%`;
    document.getElementById('wind').textContent = `Wind: ${currentWind} km/h`;

    // 4. Generate the 7-Day Forecast Row
    const forecastRow = document.getElementById('forecast-row');
    forecastRow.innerHTML = ''; // Clear out the skeleton cards

    for (let i = 0; i < 7; i++) {
        // Extract data for the specific day (i)
        const dateString = weatherData.daily.time[i];
        const maxTemp = weatherData.daily.temperature_2m_max[i];
        const minTemp = weatherData.daily.temperature_2m_min[i];
        const dailyCode = weatherData.daily.weathercode[i];
        const dailyInfo = weatherLookup[dailyCode] || { desc: "Unknown", icon: "☁️" };

        // Convert the date string (e.g., "2023-10-25") to a day name (e.g., "Wed")
        const dayName = new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' });

        // Create the HTML for the card
        const cardHTML = `
            <div class="forecast-card">
                <h3>${dayName}</h3>
                <div style="font-size: 2rem;">${dailyInfo.icon}</div>
                <p>H: ${maxTemp}°</p>
                <p>L: ${minTemp}°</p>
            </div>
        `;
        
        // Append the new card to the row
        forecastRow.insertAdjacentHTML('beforeend', cardHTML);
    }
}

async function getWeatherData(city) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        // 1. Geocoding Call
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}`, { signal: controller.signal });
        if (!geoRes.ok) throw new Error(`HTTP Error: ${geoRes.status}`);
        
        const geoData = await geoRes.json();
        if (!geoData.results) {
            showError("City not found.");
            return;
        }

        const { latitude, longitude, name } = geoData.results[0];

        // 2. Weather Call
const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
        const weatherData = await weatherRes.json();

        updateUI(name, weatherData);
        getLocalTime(weatherData.timezone); // Task 3 (jQuery)

    } catch (err) {
        if (err.name === 'AbortError') showError("Request timed out.");
        else showError("Network error occurred.");
    } finally {
        clearTimeout(timeoutId);
    }
}

function getLocalTime(timezone) {
    // jQuery AJAX chaining
    $.getJSON(`https://worldtimeapi.org/api/timezone/${timezone}`)
        .done(function(data) {
            const time = new Date(data.datetime).toLocaleTimeString();
            $('#local-time').text(`Local Time: ${time}`);
        })
        .fail(function() {
            // Fallback to browser time
            $('#local-time').text(`Time: ${new Date().toLocaleTimeString()}`);
        })
        .always(function() {
            console.log(`Time request finished at: ${new Date().toISOString()}`);
        });
}

let debounceTimer;
document.getElementById('city-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    debounceTimer = setTimeout(() => {
        if (query.length >= 2) {
            getWeatherData(query);
        } else if (query.length > 0) {
            console.log("Search term too short");
        }
    }, 500);
});