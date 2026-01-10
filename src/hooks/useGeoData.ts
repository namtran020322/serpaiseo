import { useState, useEffect, useMemo } from 'react';
import { Location, popularLocations, searchLocations } from '@/data/locations';

export function useGeoData() {
  const [allLocations, setAllLocations] = useState<Location[]>(popularLocations);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/data/geo.csv');
        const text = await response.text();
        const lines = text.split('\n').slice(1); // Skip header
        
        const locations = lines
          .filter(line => line.trim() && line.includes(','))
          .map(line => {
            // Parse CSV line handling quoted values
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (const char of line) {
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current);
            
            const [id, name, canonicalName, , countryCode, targetType, status] = values;
            
            // Only include active cities
            if (status?.trim() !== 'Active' || targetType?.trim() !== 'City') {
              return null;
            }
            
            return {
              id: id?.trim() || '',
              name: name?.trim() || '',
              canonicalName: canonicalName?.trim() || '',
              countryCode: countryCode?.trim() || '',
            };
          })
          .filter((loc): loc is Location => loc !== null && !!loc.id && !!loc.name);
        
        setAllLocations(locations);
      } catch (error) {
        console.error('Failed to load geo data:', error);
        // Fall back to popular locations
        setAllLocations(popularLocations);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  const getLocationsByCountry = useMemo(() => {
    return (countryCode: string) => {
      return allLocations.filter(loc => loc.countryCode === countryCode);
    };
  }, [allLocations]);

  const search = useMemo(() => {
    return (query: string, countryCode?: string) => {
      return searchLocations(allLocations, query, countryCode);
    };
  }, [allLocations]);

  return {
    locations: allLocations,
    isLoading,
    getLocationsByCountry,
    search,
  };
}
