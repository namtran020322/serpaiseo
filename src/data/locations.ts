// Geo locations data - will be loaded from CSV
// This file provides the interface and a utility to search locations

export interface Location {
  id: string;
  name: string;
  canonicalName: string;
  countryCode: string;
}

// Popular locations for quick access (subset from geo.csv)
export const popularLocations: Location[] = [
  // Vietnam
  { id: "1028581", name: "Hanoi", canonicalName: "Hanoi,Hanoi,Vietnam", countryCode: "VN" },
  { id: "1028589", name: "Ho Chi Minh City", canonicalName: "Ho Chi Minh City,Ho Chi Minh City,Vietnam", countryCode: "VN" },
  { id: "1028585", name: "Da Nang", canonicalName: "Da Nang,Da Nang,Vietnam", countryCode: "VN" },
  { id: "1028591", name: "Hai Phong", canonicalName: "Hai Phong,Hai Phong,Vietnam", countryCode: "VN" },
  { id: "1028586", name: "Can Tho", canonicalName: "Can Tho,Can Tho,Vietnam", countryCode: "VN" },
  
  // United States
  { id: "1014221", name: "New York", canonicalName: "New York,New York,United States", countryCode: "US" },
  { id: "1014456", name: "Los Angeles", canonicalName: "Los Angeles,California,United States", countryCode: "US" },
  { id: "1014087", name: "Chicago", canonicalName: "Chicago,Illinois,United States", countryCode: "US" },
  { id: "1026481", name: "Houston", canonicalName: "Houston,Texas,United States", countryCode: "US" },
  { id: "1014226", name: "San Francisco", canonicalName: "San Francisco,California,United States", countryCode: "US" },
  { id: "1027744", name: "Seattle", canonicalName: "Seattle,Washington,United States", countryCode: "US" },
  { id: "9003936", name: "Miami", canonicalName: "Miami-Fort Lauderdale,Florida,United States", countryCode: "US" },
  { id: "1018127", name: "Boston", canonicalName: "Boston,Massachusetts,United States", countryCode: "US" },
  
  // United Kingdom
  { id: "1006886", name: "London", canonicalName: "London,England,United Kingdom", countryCode: "GB" },
  { id: "1006992", name: "Manchester", canonicalName: "Manchester,England,United Kingdom", countryCode: "GB" },
  { id: "1006898", name: "Birmingham", canonicalName: "Birmingham,England,United Kingdom", countryCode: "GB" },
  { id: "1007010", name: "Liverpool", canonicalName: "Liverpool,England,United Kingdom", countryCode: "GB" },
  { id: "1007074", name: "Edinburgh", canonicalName: "Edinburgh,Scotland,United Kingdom", countryCode: "GB" },
  
  // Australia
  { id: "1000286", name: "Sydney", canonicalName: "Sydney,New South Wales,Australia", countryCode: "AU" },
  { id: "1000287", name: "Melbourne", canonicalName: "Melbourne,Victoria,Australia", countryCode: "AU" },
  { id: "1000288", name: "Brisbane", canonicalName: "Brisbane,Queensland,Australia", countryCode: "AU" },
  { id: "1000289", name: "Perth", canonicalName: "Perth,Western Australia,Australia", countryCode: "AU" },
  { id: "1000290", name: "Adelaide", canonicalName: "Adelaide,South Australia,Australia", countryCode: "AU" },
  
  // Singapore
  { id: "1020954", name: "Singapore", canonicalName: "Singapore,Singapore", countryCode: "SG" },
  
  // Japan
  { id: "1009282", name: "Tokyo", canonicalName: "Tokyo,Tokyo,Japan", countryCode: "JP" },
  { id: "1009283", name: "Osaka", canonicalName: "Osaka,Osaka,Japan", countryCode: "JP" },
  { id: "1009300", name: "Yokohama", canonicalName: "Yokohama,Kanagawa,Japan", countryCode: "JP" },
  { id: "1009285", name: "Nagoya", canonicalName: "Nagoya,Aichi,Japan", countryCode: "JP" },
  { id: "1009286", name: "Kyoto", canonicalName: "Kyoto,Kyoto,Japan", countryCode: "JP" },
  
  // South Korea
  { id: "1011744", name: "Seoul", canonicalName: "Seoul,Seoul,South Korea", countryCode: "KR" },
  { id: "1011745", name: "Busan", canonicalName: "Busan,Busan,South Korea", countryCode: "KR" },
  { id: "1011754", name: "Incheon", canonicalName: "Incheon,Incheon,South Korea", countryCode: "KR" },
  
  // Germany
  { id: "1003854", name: "Berlin", canonicalName: "Berlin,Berlin,Germany", countryCode: "DE" },
  { id: "1003857", name: "Munich", canonicalName: "Munich,Bavaria,Germany", countryCode: "DE" },
  { id: "1003855", name: "Hamburg", canonicalName: "Hamburg,Hamburg,Germany", countryCode: "DE" },
  { id: "1003871", name: "Frankfurt", canonicalName: "Frankfurt,Hesse,Germany", countryCode: "DE" },
  
  // France
  { id: "1006094", name: "Paris", canonicalName: "Paris,Ile-de-France,France", countryCode: "FR" },
  { id: "1006273", name: "Lyon", canonicalName: "Lyon,Auvergne-Rhone-Alpes,France", countryCode: "FR" },
  { id: "1006098", name: "Marseille", canonicalName: "Marseille,Provence-Alpes-Cote d'Azur,France", countryCode: "FR" },
  
  // Thailand
  { id: "1023191", name: "Bangkok", canonicalName: "Bangkok,Bangkok,Thailand", countryCode: "TH" },
  { id: "1023271", name: "Chiang Mai", canonicalName: "Chiang Mai,Chiang Mai,Thailand", countryCode: "TH" },
  { id: "1023298", name: "Phuket", canonicalName: "Phuket,Phuket,Thailand", countryCode: "TH" },
  
  // Malaysia
  { id: "1011033", name: "Kuala Lumpur", canonicalName: "Kuala Lumpur,Kuala Lumpur,Malaysia", countryCode: "MY" },
  { id: "1011043", name: "Penang", canonicalName: "George Town,Penang,Malaysia", countryCode: "MY" },
  { id: "1011053", name: "Johor Bahru", canonicalName: "Johor Bahru,Johor,Malaysia", countryCode: "MY" },
  
  // Indonesia
  { id: "1007776", name: "Jakarta", canonicalName: "Jakarta,Jakarta,Indonesia", countryCode: "ID" },
  { id: "1007805", name: "Surabaya", canonicalName: "Surabaya,East Java,Indonesia", countryCode: "ID" },
  { id: "1007813", name: "Bandung", canonicalName: "Bandung,West Java,Indonesia", countryCode: "ID" },
  { id: "1007779", name: "Bali", canonicalName: "Denpasar,Bali,Indonesia", countryCode: "ID" },
  
  // India
  { id: "1007768", name: "Mumbai", canonicalName: "Mumbai,Maharashtra,India", countryCode: "IN" },
  { id: "1007751", name: "Delhi", canonicalName: "Delhi,Delhi,India", countryCode: "IN" },
  { id: "1007738", name: "Bangalore", canonicalName: "Bangalore,Karnataka,India", countryCode: "IN" },
  { id: "1007750", name: "Chennai", canonicalName: "Chennai,Tamil Nadu,India", countryCode: "IN" },
  { id: "1007759", name: "Hyderabad", canonicalName: "Hyderabad,Telangana,India", countryCode: "IN" },
  
  // China
  { id: "1002083", name: "Beijing", canonicalName: "Beijing,Beijing,China", countryCode: "CN" },
  { id: "1002089", name: "Shanghai", canonicalName: "Shanghai,Shanghai,China", countryCode: "CN" },
  { id: "1002090", name: "Guangzhou", canonicalName: "Guangzhou,Guangdong,China", countryCode: "CN" },
  { id: "1002091", name: "Shenzhen", canonicalName: "Shenzhen,Guangdong,China", countryCode: "CN" },
  
  // Taiwan
  { id: "1023037", name: "Taipei", canonicalName: "Taipei,Taipei City,Taiwan", countryCode: "TW" },
  { id: "1023043", name: "Kaohsiung", canonicalName: "Kaohsiung,Kaohsiung City,Taiwan", countryCode: "TW" },
  
  // Hong Kong
  { id: "1006847", name: "Hong Kong", canonicalName: "Hong Kong,Hong Kong", countryCode: "HK" },
  
  // Brazil
  { id: "1003654", name: "Sao Paulo", canonicalName: "Sao Paulo,Sao Paulo,Brazil", countryCode: "BR" },
  { id: "1003697", name: "Rio de Janeiro", canonicalName: "Rio de Janeiro,Rio de Janeiro,Brazil", countryCode: "BR" },
  
  // Mexico
  { id: "1010167", name: "Mexico City", canonicalName: "Mexico City,Distrito Federal,Mexico", countryCode: "MX" },
  
  // Canada
  { id: "1002287", name: "Toronto", canonicalName: "Toronto,Ontario,Canada", countryCode: "CA" },
  { id: "1002288", name: "Vancouver", canonicalName: "Vancouver,British Columbia,Canada", countryCode: "CA" },
  { id: "1002289", name: "Montreal", canonicalName: "Montreal,Quebec,Canada", countryCode: "CA" },
  
  // Russia
  { id: "1012004", name: "Moscow", canonicalName: "Moscow,Moscow,Russia", countryCode: "RU" },
  { id: "1012016", name: "Saint Petersburg", canonicalName: "Saint Petersburg,Saint Petersburg,Russia", countryCode: "RU" },
  
  // Spain
  { id: "1005493", name: "Madrid", canonicalName: "Madrid,Community of Madrid,Spain", countryCode: "ES" },
  { id: "1005500", name: "Barcelona", canonicalName: "Barcelona,Catalonia,Spain", countryCode: "ES" },
  
  // Italy
  { id: "1008463", name: "Rome", canonicalName: "Rome,Lazio,Italy", countryCode: "IT" },
  { id: "1008474", name: "Milan", canonicalName: "Milan,Lombardy,Italy", countryCode: "IT" },
  
  // Netherlands
  { id: "1010521", name: "Amsterdam", canonicalName: "Amsterdam,North Holland,Netherlands", countryCode: "NL" },
  
  // Sweden
  { id: "1022581", name: "Stockholm", canonicalName: "Stockholm,Stockholms lan,Sweden", countryCode: "SE" },
  
  // Norway
  { id: "1010757", name: "Oslo", canonicalName: "Oslo,Oslo,Norway", countryCode: "NO" },
  
  // Denmark
  { id: "1005066", name: "Copenhagen", canonicalName: "Copenhagen,Capital Region of Denmark,Denmark", countryCode: "DK" },
  
  // Finland
  { id: "1005728", name: "Helsinki", canonicalName: "Helsinki,Uusimaa,Finland", countryCode: "FI" },
  
  // Poland
  { id: "1011377", name: "Warsaw", canonicalName: "Warsaw,Masovian Voivodeship,Poland", countryCode: "PL" },
  
  // Ukraine
  { id: "1023609", name: "Kyiv", canonicalName: "Kyiv,Kyiv,Ukraine", countryCode: "UA" },
  
  // Philippines
  { id: "1011192", name: "Manila", canonicalName: "Manila,Metro Manila,Philippines", countryCode: "PH" },
];

// Function to filter locations by country code
export function getLocationsByCountry(countryCode: string): Location[] {
  return popularLocations.filter(loc => loc.countryCode === countryCode);
}

// This will be used to load and search the full geo.csv file
export async function loadGeoData(): Promise<Location[]> {
  try {
    const response = await fetch('/data/geo.csv');
    const text = await response.text();
    const lines = text.split('\n').slice(1); // Skip header
    
    return lines
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(',');
        const id = parts[0];
        const name = parts[1];
        // Handle canonical name that might contain commas
        const canonicalNameParts = [];
        let inQuotes = false;
        let current = '';
        
        for (let i = 2; i < parts.length; i++) {
          const part = parts[i];
          if (part.startsWith('"') && !inQuotes) {
            inQuotes = true;
            current = part.slice(1);
          } else if (part.endsWith('"') && inQuotes) {
            current += ',' + part.slice(0, -1);
            canonicalNameParts.push(current);
            inQuotes = false;
            current = '';
          } else if (inQuotes) {
            current += ',' + part;
          } else {
            canonicalNameParts.push(part);
          }
        }
        
        const canonicalName = canonicalNameParts[0] || `${name}`;
        const countryCode = parts[4] || '';
        
        return {
          id,
          name,
          canonicalName,
          countryCode
        };
      })
      .filter(loc => loc.id && loc.name);
  } catch (error) {
    console.error('Failed to load geo data:', error);
    return popularLocations;
  }
}

// Search locations by name or canonical name
export function searchLocations(locations: Location[], query: string, countryCode?: string): Location[] {
  const searchTerm = query.toLowerCase();
  return locations
    .filter(loc => {
      const matchesQuery = loc.name.toLowerCase().includes(searchTerm) || 
                          loc.canonicalName.toLowerCase().includes(searchTerm);
      const matchesCountry = !countryCode || loc.countryCode === countryCode;
      return matchesQuery && matchesCountry;
    })
    .slice(0, 50); // Limit results
}
