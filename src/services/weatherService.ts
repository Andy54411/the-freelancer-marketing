/**
 * Weather Service using Open-Meteo API (free, no API key required)
 * Provides weather data for the schedule view
 */

export interface DailyWeather {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: 'sun' | 'cloud' | 'cloud-sun' | 'cloud-rain' | 'cloud-snow' | 'cloud-fog' | 'cloud-lightning';
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  daily: DailyWeather[];
}

// WMO Weather interpretation codes
// https://open-meteo.com/en/docs
const WEATHER_CODES: Record<number, { description: string; icon: DailyWeather['weatherIcon'] }> = {
  0: { description: 'Klar', icon: 'sun' },
  1: { description: 'Überwiegend klar', icon: 'sun' },
  2: { description: 'Teilweise bewölkt', icon: 'cloud-sun' },
  3: { description: 'Bewölkt', icon: 'cloud' },
  45: { description: 'Nebel', icon: 'cloud-fog' },
  48: { description: 'Nebel mit Reif', icon: 'cloud-fog' },
  51: { description: 'Leichter Nieselregen', icon: 'cloud-rain' },
  53: { description: 'Nieselregen', icon: 'cloud-rain' },
  55: { description: 'Starker Nieselregen', icon: 'cloud-rain' },
  56: { description: 'Gefrierender Nieselregen', icon: 'cloud-rain' },
  57: { description: 'Starker gefr. Nieselregen', icon: 'cloud-rain' },
  61: { description: 'Leichter Regen', icon: 'cloud-rain' },
  63: { description: 'Regen', icon: 'cloud-rain' },
  65: { description: 'Starker Regen', icon: 'cloud-rain' },
  66: { description: 'Gefrierender Regen', icon: 'cloud-rain' },
  67: { description: 'Starker gefr. Regen', icon: 'cloud-rain' },
  71: { description: 'Leichter Schneefall', icon: 'cloud-snow' },
  73: { description: 'Schneefall', icon: 'cloud-snow' },
  75: { description: 'Starker Schneefall', icon: 'cloud-snow' },
  77: { description: 'Schneegriesel', icon: 'cloud-snow' },
  80: { description: 'Leichte Regenschauer', icon: 'cloud-rain' },
  81: { description: 'Regenschauer', icon: 'cloud-rain' },
  82: { description: 'Starke Regenschauer', icon: 'cloud-rain' },
  85: { description: 'Leichte Schneeschauer', icon: 'cloud-snow' },
  86: { description: 'Starke Schneeschauer', icon: 'cloud-snow' },
  95: { description: 'Gewitter', icon: 'cloud-lightning' },
  96: { description: 'Gewitter mit Hagel', icon: 'cloud-lightning' },
  99: { description: 'Starkes Gewitter mit Hagel', icon: 'cloud-lightning' },
};

// Default coordinates for Germany (Berlin)
const DEFAULT_COORDS = {
  latitude: 52.52,
  longitude: 13.405,
};

// German city coordinates lookup
const GERMAN_CITIES: Record<string, { lat: number; lon: number }> = {
  'berlin': { lat: 52.52, lon: 13.405 },
  'hamburg': { lat: 53.5511, lon: 9.9937 },
  'münchen': { lat: 48.1351, lon: 11.582 },
  'munich': { lat: 48.1351, lon: 11.582 },
  'köln': { lat: 50.9375, lon: 6.9603 },
  'cologne': { lat: 50.9375, lon: 6.9603 },
  'frankfurt': { lat: 50.1109, lon: 8.6821 },
  'stuttgart': { lat: 48.7758, lon: 9.1829 },
  'düsseldorf': { lat: 51.2277, lon: 6.7735 },
  'dortmund': { lat: 51.5136, lon: 7.4653 },
  'essen': { lat: 51.4556, lon: 7.0116 },
  'leipzig': { lat: 51.3397, lon: 12.3731 },
  'bremen': { lat: 53.0793, lon: 8.8017 },
  'dresden': { lat: 51.0504, lon: 13.7373 },
  'hannover': { lat: 52.3759, lon: 9.732 },
  'nürnberg': { lat: 49.4521, lon: 11.0767 },
  'nuremberg': { lat: 49.4521, lon: 11.0767 },
  'duisburg': { lat: 51.4344, lon: 6.7623 },
  'bochum': { lat: 51.4818, lon: 7.2162 },
  'wuppertal': { lat: 51.2562, lon: 7.1508 },
  'bielefeld': { lat: 52.0302, lon: 8.5325 },
  'bonn': { lat: 50.7374, lon: 7.0982 },
  'münster': { lat: 51.9607, lon: 7.6261 },
  'karlsruhe': { lat: 49.0069, lon: 8.4037 },
  'mannheim': { lat: 49.4875, lon: 8.466 },
  'augsburg': { lat: 48.3705, lon: 10.8978 },
  'wiesbaden': { lat: 50.0782, lon: 8.2398 },
  'gelsenkirchen': { lat: 51.5177, lon: 7.0857 },
  'mönchengladbach': { lat: 51.1805, lon: 6.4428 },
  'braunschweig': { lat: 52.2689, lon: 10.5268 },
  'chemnitz': { lat: 50.8278, lon: 12.9214 },
  'kiel': { lat: 54.3233, lon: 10.1228 },
  'aachen': { lat: 50.7753, lon: 6.0839 },
  'halle': { lat: 51.4969, lon: 11.9688 },
  'magdeburg': { lat: 52.1205, lon: 11.6276 },
  'freiburg': { lat: 47.999, lon: 7.8421 },
  'krefeld': { lat: 51.3388, lon: 6.5853 },
  'lübeck': { lat: 53.8655, lon: 10.6866 },
  'oberhausen': { lat: 51.4963, lon: 6.8635 },
  'erfurt': { lat: 50.9848, lon: 11.0299 },
  'mainz': { lat: 49.9929, lon: 8.2473 },
  'rostock': { lat: 54.0924, lon: 12.0991 },
  'kassel': { lat: 51.3127, lon: 9.4797 },
  'hagen': { lat: 51.3671, lon: 7.4633 },
  'hamm': { lat: 51.6739, lon: 7.8159 },
  'saarbrücken': { lat: 49.2402, lon: 6.9969 },
  'mülheim': { lat: 51.4272, lon: 6.8825 },
  'potsdam': { lat: 52.3906, lon: 13.0645 },
  'ludwigshafen': { lat: 49.4774, lon: 8.445 },
  'oldenburg': { lat: 53.1435, lon: 8.2146 },
  'leverkusen': { lat: 51.0459, lon: 6.9842 },
  'osnabrück': { lat: 52.2799, lon: 8.0472 },
  'solingen': { lat: 51.1652, lon: 7.0671 },
  'heidelberg': { lat: 49.3988, lon: 8.6724 },
  'herne': { lat: 51.5369, lon: 7.2006 },
  'neuss': { lat: 51.1981, lon: 6.6919 },
  'darmstadt': { lat: 49.8728, lon: 8.6512 },
  'paderborn': { lat: 51.7189, lon: 8.7575 },
  'regensburg': { lat: 49.0134, lon: 12.1016 },
  'ingolstadt': { lat: 48.7665, lon: 11.4258 },
  'würzburg': { lat: 49.7913, lon: 9.9534 },
  'fürth': { lat: 49.4774, lon: 10.9886 },
  'wolfsburg': { lat: 52.4227, lon: 10.7865 },
  'ulm': { lat: 48.4011, lon: 9.9876 },
  'heilbronn': { lat: 49.1427, lon: 9.2109 },
  'pforzheim': { lat: 48.8922, lon: 8.6947 },
  'göttingen': { lat: 51.5413, lon: 9.9158 },
  'bottrop': { lat: 51.5247, lon: 6.9292 },
  'trier': { lat: 49.7596, lon: 6.6439 },
  'recklinghausen': { lat: 51.6141, lon: 7.1979 },
  'reutlingen': { lat: 48.4914, lon: 9.2043 },
  'bremerhaven': { lat: 53.5396, lon: 8.5809 },
  'koblenz': { lat: 50.3569, lon: 7.5889 },
  'bergisch gladbach': { lat: 50.9918, lon: 7.1303 },
  'jena': { lat: 50.9271, lon: 11.5892 },
  'remscheid': { lat: 51.1787, lon: 7.1896 },
  'erlangen': { lat: 49.5897, lon: 11.0078 },
  'moers': { lat: 51.4516, lon: 6.6263 },
  'siegen': { lat: 50.8748, lon: 8.0243 },
  'hildesheim': { lat: 52.1508, lon: 9.9511 },
  'salzgitter': { lat: 52.1539, lon: 10.3341 },
  'cottbus': { lat: 51.7563, lon: 14.3329 },
  'kaiserslautern': { lat: 49.4401, lon: 7.7491 },
  'gütersloh': { lat: 51.9032, lon: 8.3858 },
  'schwerin': { lat: 53.6355, lon: 11.4012 },
  'witten': { lat: 51.4435, lon: 7.3527 },
  'gera': { lat: 50.8806, lon: 12.0833 },
  'iserlohn': { lat: 51.3758, lon: 7.6947 },
  'zwickau': { lat: 50.7189, lon: 12.4964 },
  'düren': { lat: 50.8048, lon: 6.4823 },
  'ratingen': { lat: 51.2969, lon: 6.8491 },
  'esslingen': { lat: 48.7397, lon: 9.3048 },
  'lünen': { lat: 51.6166, lon: 7.5275 },
  'marl': { lat: 51.6566, lon: 7.0857 },
  'hanau': { lat: 50.1264, lon: 8.9274 },
  'flensburg': { lat: 54.7937, lon: 9.4469 },
  'tübingen': { lat: 48.5216, lon: 9.0576 },
  'villingen-schwenningen': { lat: 48.0603, lon: 8.4641 },
  'velbert': { lat: 51.3382, lon: 7.0431 },
  'konstanz': { lat: 47.6633, lon: 9.1752 },
  'minden': { lat: 52.2889, lon: 8.9177 },
  'neumünster': { lat: 54.0733, lon: 9.9848 },
  'norderstedt': { lat: 53.7063, lon: 9.9869 },
  'delmenhorst': { lat: 53.0505, lon: 8.6317 },
  'viersen': { lat: 51.2552, lon: 6.3945 },
  'wilhelmshaven': { lat: 53.5308, lon: 8.1108 },
  'gladbeck': { lat: 51.5705, lon: 6.9857 },
  'troisdorf': { lat: 50.8097, lon: 7.1468 },
  'dorsten': { lat: 51.6574, lon: 6.9626 },
  'detmold': { lat: 51.9365, lon: 8.8831 },
  'arnsberg': { lat: 51.3965, lon: 8.0645 },
  'castrop-rauxel': { lat: 51.5549, lon: 7.3113 },
  'lüdenscheid': { lat: 51.2195, lon: 7.6294 },
  'bocholt': { lat: 51.8393, lon: 6.6172 },
  'landshut': { lat: 48.5372, lon: 12.1522 },
  'aschaffenburg': { lat: 49.9769, lon: 9.1535 },
  'kempten': { lat: 47.7267, lon: 10.3168 },
  'fulda': { lat: 50.5528, lon: 9.6778 },
  'lippstadt': { lat: 51.6731, lon: 8.3448 },
  'dinslaken': { lat: 51.5673, lon: 6.7432 },
  'hertens': { lat: 51.6000, lon: 7.1333 },
  'kerpen': { lat: 50.8697, lon: 6.6961 },
  'plauen': { lat: 50.4939, lon: 12.1367 },
  'neuwied': { lat: 50.4338, lon: 7.4616 },
  'dormagen': { lat: 51.0972, lon: 6.8314 },
  'sindelfingen': { lat: 48.7079, lon: 9.0032 },
  'grevenbroich': { lat: 51.0877, lon: 6.5873 },
  'rosenheim': { lat: 47.8561, lon: 12.1289 },
  'hürth': { lat: 50.8696, lon: 6.8666 },
  'bergheim': { lat: 50.9571, lon: 6.6417 },
  'langenfeld': { lat: 51.1108, lon: 6.9483 },
  'stralsund': { lat: 54.3093, lon: 13.0818 },
  'friedrichshafen': { lat: 47.6543, lon: 9.4791 },
  'offenburg': { lat: 48.4729, lon: 7.9401 },
  'weimar': { lat: 50.9795, lon: 11.3235 },
  'euskirchen': { lat: 50.6594, lon: 6.7906 },
  'göppingen': { lat: 48.7025, lon: 9.6528 },
  'meerbusch': { lat: 51.2522, lon: 6.6669 },
  'unna': { lat: 51.5348, lon: 7.6891 },
  'langenhagen': { lat: 52.4386, lon: 9.7397 },
  'pulheim': { lat: 50.9986, lon: 6.8025 },
  'baden-baden': { lat: 48.7606, lon: 8.2409 },
  'stolberg': { lat: 50.7658, lon: 6.2268 },
  'greifswald': { lat: 54.0865, lon: 13.3923 },
  'waiblingen': { lat: 48.8304, lon: 9.3169 },
  'hameln': { lat: 52.1037, lon: 9.3568 },
  'ibbenbüren': { lat: 52.2785, lon: 7.7153 },
  'gummersbach': { lat: 51.0264, lon: 7.5647 },
  'rastatt': { lat: 48.8585, lon: 8.2043 },
  'goslar': { lat: 51.9059, lon: 10.4291 },
  'böblingen': { lat: 48.6859, lon: 9.0153 },
  'elmshorn': { lat: 53.7528, lon: 9.6566 },
  'celle': { lat: 52.6227, lon: 10.0808 },
  'emden': { lat: 53.3669, lon: 7.2061 },
  'frechen': { lat: 50.9149, lon: 6.8143 },
  'passau': { lat: 48.5665, lon: 13.4314 },
  'wolfenbüttel': { lat: 52.1646, lon: 10.5332 },
  'kleve': { lat: 51.7879, lon: 6.1384 },
  'neu-ulm': { lat: 48.3912, lon: 10.0125 },
  'nordhorn': { lat: 52.4286, lon: 7.0678 },
  'cuxhaven': { lat: 53.8614, lon: 8.6943 },
  'menden': { lat: 51.4434, lon: 7.7779 },
  'ahlen': { lat: 51.7634, lon: 7.8911 },
  'heidenheim': { lat: 48.6767, lon: 10.1544 },
  'neubrandenburg': { lat: 53.5579, lon: 13.2612 },
  'wetzlar': { lat: 50.5564, lon: 8.5046 },
  'lingen': { lat: 52.5246, lon: 7.3167 },
  'leonberg': { lat: 48.8001, lon: 9.0152 },
  'alsdorf': { lat: 50.8749, lon: 6.1633 },
  'schwäbisch gmünd': { lat: 48.7995, lon: 9.7983 },
  'lörrach': { lat: 47.6152, lon: 7.6616 },
  'meschede': { lat: 51.3498, lon: 8.2833 },
  'neustadt': { lat: 49.3494, lon: 8.1386 },
  'albstadt': { lat: 48.2114, lon: 9.0259 },
  'willich': { lat: 51.2636, lon: 6.5494 },
  'brühl': { lat: 50.8286, lon: 6.9069 },
  'speyer': { lat: 49.3173, lon: 8.4411 },
  'peine': { lat: 52.3203, lon: 10.2314 },
  'aalen': { lat: 48.8376, lon: 10.0932 },
  'sankt augustin': { lat: 50.7708, lon: 7.1867 },
  'erftstadt': { lat: 50.8082, lon: 6.7667 },
  'worms': { lat: 49.6341, lon: 8.3507 },
  'frankenthal': { lat: 49.5338, lon: 8.3525 },
  'stade': { lat: 53.5977, lon: 9.4769 },
  'pirmasens': { lat: 49.2006, lon: 7.6046 },
  'rottenburg': { lat: 48.4766, lon: 8.9354 },
  'biberach': { lat: 48.1013, lon: 9.7876 },
  'bruchsal': { lat: 49.1246, lon: 8.5980 },
  'rheine': { lat: 52.2854, lon: 7.4400 },
  'heinsberg': { lat: 51.0621, lon: 6.0954 },
  'filderstadt': { lat: 48.6573, lon: 9.2205 },
  'oranienburg': { lat: 52.7549, lon: 13.2369 },
  'kaufbeuren': { lat: 47.8804, lon: 10.6222 },
  'lahr': { lat: 48.3369, lon: 7.8740 },
  'coburg': { lat: 50.2612, lon: 10.9627 },
  'pinneberg': { lat: 53.6556, lon: 9.7997 },
  'wesseling': { lat: 50.8268, lon: 6.9756 },
  'schweinfurt': { lat: 50.0490, lon: 10.2283 },
  'kamp-lintfort': { lat: 51.5027, lon: 6.5459 },
  'hattingen': { lat: 51.3989, lon: 7.1861 },
  'limburg': { lat: 50.3842, lon: 8.0625 },
  'schwerte': { lat: 51.4453, lon: 7.5636 },
  'bayreuth': { lat: 49.9481, lon: 11.5783 },
  'weinheim': { lat: 49.5508, lon: 8.6682 },
  'bamberg': { lat: 49.8988, lon: 10.9028 },
};

/**
 * Get coordinates from city name (case-insensitive)
 */
function getCoordsFromCity(city: string): { lat: number; lon: number } | null {
  const normalizedCity = city.toLowerCase().trim();
  return GERMAN_CITIES[normalizedCity] || null;
}

/**
 * Get coordinates from postal code using geocoding
 */
async function getCoordsFromPostalCode(postalCode: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${postalCode}&count=1&language=de&format=json`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return {
        lat: data.results[0].latitude,
        lon: data.results[0].longitude,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch weather data for a specific location
 */
export async function fetchWeatherData(
  latitude: number = DEFAULT_COORDS.latitude,
  longitude: number = DEFAULT_COORDS.longitude
): Promise<WeatherData | null> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${latitude}&longitude=${longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
      `&timezone=Europe/Berlin` +
      `&forecast_days=14`
    );

    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();

    const daily: DailyWeather[] = data.daily.time.map((date: string, index: number) => {
      const weatherCode = data.daily.weathercode[index];
      const weatherInfo = WEATHER_CODES[weatherCode] || { description: 'Unbekannt', icon: 'cloud' as const };

      return {
        date,
        temperatureMax: Math.round(data.daily.temperature_2m_max[index]),
        temperatureMin: Math.round(data.daily.temperature_2m_min[index]),
        weatherCode,
        weatherDescription: weatherInfo.description,
        weatherIcon: weatherInfo.icon,
      };
    });

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      daily,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch weather data based on company address
 */
export async function fetchWeatherForCompany(companyData: {
  city?: string;
  postalCode?: string;
  address?: string;
}): Promise<WeatherData | null> {
  let coords: { lat: number; lon: number } | null = null;

  // Try to get coords from city name first
  if (companyData.city) {
    coords = getCoordsFromCity(companyData.city);
  }

  // Try postal code if city didn't work
  if (!coords && companyData.postalCode) {
    coords = await getCoordsFromPostalCode(companyData.postalCode);
  }

  // Use default if nothing worked
  if (!coords) {
    coords = { lat: DEFAULT_COORDS.latitude, lon: DEFAULT_COORDS.longitude };
  }

  return fetchWeatherData(coords.lat, coords.lon);
}

/**
 * Get weather for a specific date from weather data
 */
export function getWeatherForDate(weatherData: WeatherData | null, date: string): DailyWeather | null {
  if (!weatherData) return null;
  return weatherData.daily.find(d => d.date === date) || null;
}
