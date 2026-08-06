export interface DayForecast {
  high: number;
  low: number;
  precipitationProbability: number;
}

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

/**
 * Open-Meteo — no API key needed, which keeps this proportionate to a
 * single-family app. Returns a date (YYYY-MM-DD) -> forecast map covering
 * today + the next few days.
 */
export async function fetchForecast(latitude: number, longitude: number): Promise<Map<string, DayForecast>> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "3");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const forecast = new Map<string, DayForecast>();
  data.daily.time.forEach((date, i) => {
    forecast.set(date, {
      high: data.daily.temperature_2m_max[i],
      low: data.daily.temperature_2m_min[i],
      precipitationProbability: data.daily.precipitation_probability_max[i],
    });
  });
  return forecast;
}
