/**
 * Weather API helper using Open-Meteo (free, no API key required)
 * Fetches current weather data for a given city
 */

interface GeocodingResult {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    country: string;
  }>;
}

interface WeatherResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
  };
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  conditions: string;
  icon: string;
  fetchedAt: number;
}

// Weather code to condition mapping (WMO codes)
const weatherCodeToCondition: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear sky', icon: '☀️' },
  1: { condition: 'Mainly clear', icon: '🌤️' },
  2: { condition: 'Partly cloudy', icon: '⛅' },
  3: { condition: 'Overcast', icon: '☁️' },
  45: { condition: 'Foggy', icon: '🌫️' },
  48: { condition: 'Depositing rime fog', icon: '🌫️' },
  51: { condition: 'Light drizzle', icon: '🌧️' },
  53: { condition: 'Moderate drizzle', icon: '🌧️' },
  55: { condition: 'Dense drizzle', icon: '🌧️' },
  56: { condition: 'Freezing drizzle', icon: '🌨️' },
  57: { condition: 'Dense freezing drizzle', icon: '🌨️' },
  61: { condition: 'Slight rain', icon: '🌧️' },
  63: { condition: 'Moderate rain', icon: '🌧️' },
  65: { condition: 'Heavy rain', icon: '🌧️' },
  66: { condition: 'Freezing rain', icon: '🌨️' },
  67: { condition: 'Heavy freezing rain', icon: '🌨️' },
  71: { condition: 'Slight snow', icon: '🌨️' },
  73: { condition: 'Moderate snow', icon: '🌨️' },
  75: { condition: 'Heavy snow', icon: '❄️' },
  77: { condition: 'Snow grains', icon: '🌨️' },
  80: { condition: 'Slight rain showers', icon: '🌦️' },
  81: { condition: 'Moderate rain showers', icon: '🌦️' },
  82: { condition: 'Violent rain showers', icon: '⛈️' },
  85: { condition: 'Slight snow showers', icon: '🌨️' },
  86: { condition: 'Heavy snow showers', icon: '❄️' },
  95: { condition: 'Thunderstorm', icon: '⛈️' },
  96: { condition: 'Thunderstorm with hail', icon: '⛈️' },
  99: { condition: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

/**
 * Fetch coordinates for a city name using Open-Meteo Geocoding API
 */
async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }
    
    const data: GeocodingResult = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.warn('City not found:', city);
      return null;
    }
    
    const result = data.results[0];
    return {
      lat: result.latitude,
      lon: result.longitude,
      name: `${result.name}, ${result.country}`,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Fetch current weather data for a city
 */
export async function fetchWeather(city: string): Promise<WeatherData | null> {
  try {
    // First, geocode the city
    const location = await geocodeCity(city);
    if (!location) {
      return null;
    }
    
    // Fetch weather data
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=auto`;
    
    const response = await fetch(weatherUrl);
    
    if (!response.ok) {
      console.error('Weather API error:', response.status);
      return null;
    }
    
    const data: WeatherResponse = await response.json();
    
    const weatherInfo = weatherCodeToCondition[data.current.weather_code] || {
      condition: 'Unknown',
      icon: '❓',
    };
    
    return {
      temp: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      conditions: weatherInfo.condition,
      icon: weatherInfo.icon,
      fetchedAt: Date.now(),
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}
