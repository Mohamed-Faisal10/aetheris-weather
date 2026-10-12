/* ==========================================================================
   AETHERIS WEATHER SUITE - ASYNC FETCH & TELEMETRY LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // DOM Elements
  const searchForm = document.getElementById('searchForm');
  const cityInput = document.getElementById('cityInput');
  const cityNameEl = document.getElementById('cityName');
  const countryTagEl = document.getElementById('countryTag');
  const currentTimeEl = document.getElementById('currentTime');
  const loadingOverlay = document.getElementById('loadingOverlay');
  
  const conditionBadge = document.getElementById('conditionBadge');
  const conditionText = document.getElementById('conditionText');
  const currentTemp = document.getElementById('currentTemp');
  const feelsLikeTemp = document.getElementById('feelsLikeTemp');
  const maxTemp = document.getElementById('maxTemp');
  const minTemp = document.getElementById('minTemp');
  const heroIconContainer = document.getElementById('heroIconContainer');
  
  const windSpeed = document.getElementById('windSpeed');
  const humidity = document.getElementById('humidity');
  const pressure = document.getElementById('pressure');
  const uvIndex = document.getElementById('uvIndex');
  const forecastGrid = document.getElementById('forecastGrid');
  const quickCitiesContainer = document.getElementById('quickCities');
  const toastNotification = document.getElementById('toastNotification');

  // Helper: Show Toast
  function showToast(message, isError = false) {
    toastNotification.textContent = message;
    toastNotification.classList.toggle('error', isError);
    toastNotification.classList.add('show');
    setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 3500);
  }

  // Weather Code Interpreter
  function getWeatherDetails(code) {
    const weatherMap = {
      0: { text: 'Clear Sky', icon: 'fa-sun', class: 'sunny' },
      1: { text: 'Mainly Clear', icon: 'fa-cloud-sun', class: 'sunny' },
      2: { text: 'Partly Cloudy', icon: 'fa-cloud-sun', class: 'cloudy' },
      3: { text: 'Overcast', icon: 'fa-cloud', class: 'cloudy' },
      45: { text: 'Foggy', icon: 'fa-smog', class: 'foggy' },
      51: { text: 'Light Drizzle', icon: 'fa-cloud-rain', class: 'rainy' },
      61: { text: 'Rain Showers', icon: 'fa-cloud-showers-heavy', class: 'rainy' },
      71: { text: 'Snowfall', icon: 'fa-snowflake', class: 'snowy' },
      95: { text: 'Thunderstorm', icon: 'fa-bolt', class: 'stormy' }
    };
    return weatherMap[code] || { text: 'Variable Conditions', icon: 'fa-cloud', class: 'cloudy' };
  }

  // Fetch Weather Data via Open-Meteo API
  async function fetchWeatherData(lat, lon, cityName, country = '') {
    loadingOverlay.classList.add('active');

    try {
      // Open-Meteo Free Endpoints for Current & Daily Forecasts
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to retrieve meteorological telemetry');

      const data = await response.json();

      // Update UI Header
      cityNameEl.textContent = cityName;
      countryTagEl.textContent = country || 'INTL';
      currentTimeEl.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Current Conditions
      const current = data.current;
      const daily = data.daily;
      const weatherInfo = getWeatherDetails(current.weather_code);

      currentTemp.textContent = Math.round(current.temperature_2m);
      feelsLikeTemp.textContent = Math.round(current.apparent_temperature);
      conditionText.textContent = weatherInfo.text;
      conditionBadge.innerHTML = `<i class="fa-solid ${weatherInfo.icon}"></i> <span>${weatherInfo.text}</span>`;
      heroIconContainer.innerHTML = `<i class="fa-solid ${weatherInfo.icon} ${weatherInfo.class}"></i>`;

      maxTemp.textContent = Math.round(daily.temperature_2m_max[0]);
      minTemp.textContent = Math.round(daily.temperature_2m_min[0]);

      // Metrics
      windSpeed.textContent = `${current.wind_speed_10m} km/h`;
      humidity.textContent = `${current.relative_humidity_2m}%`;
      pressure.textContent = `${current.surface_pressure} hPa`;
      uvIndex.textContent = '4.5 (Moderate)';

      // 7-Day Forecast Rendering
      forecastGrid.innerHTML = '';
      for (let i = 0; i < 7; i++) {
        const dateObj = new Date(daily.time[i]);
        const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const fWeather = getWeatherDetails(daily.weather_code[i]);

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
          <div class="forecast-day">${dayName}</div>
          <div class="forecast-icon"><i class="fa-solid ${fWeather.icon}"></i></div>
          <div class="forecast-temps">
            <span class="temp-max">${Math.round(daily.temperature_2m_max[i])}°</span>
            <span class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</span>
          </div>
        `;
        forecastGrid.appendChild(card);
      }

      showToast(`Telemetry synchronized for ${cityName}`);
    } catch (error) {
      console.error(error);
      showToast('Error connecting to weather satellite API', true);
    } finally {
      loadingOverlay.classList.remove('active');
    }
  }

  // Geocoding Search via Open-Meteo Geocoding API
  async function searchCity(query) {
    if (!query.trim()) return;
    loadingOverlay.classList.add('active');

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
      const response = await fetch(geoUrl);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        showToast(`City "${query}" not found in station database`, true);
        loadingOverlay.classList.remove('active');
        return;
      }

      const match = data.results[0];
      await fetchWeatherData(match.latitude, match.longitude, match.name, match.country_code);
    } catch (error) {
      console.error(error);
      showToast('Search query failed', true);
      loadingOverlay.classList.remove('active');
    }
  }

  // Search Form Submit
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = cityInput.value.trim();
    if (query) {
      searchCity(query);
      cityInput.value = '';
    }
  });

  // Quick Chips Click Event
  quickCitiesContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.city-chip');
    if (!chip) return;

    document.querySelectorAll('.city-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const lat = chip.getAttribute('data-lat');
    const lon = chip.getAttribute('data-lon');
    const cityName = chip.getAttribute('data-city');

    fetchWeatherData(lat, lon, cityName, 'GB/JP/US');
  });

  // Initial Load: Default to London
  fetchWeatherData('51.5074', '-0.1278', 'London', 'GB');
});
