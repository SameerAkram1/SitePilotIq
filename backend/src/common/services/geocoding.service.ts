import { Injectable, Logger } from '@nestjs/common';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface GeocodingSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org/search';
  private readonly userAgent = 'SitePilotIQ/1.0';

  async searchAddresses(address: string): Promise<GeocodingSearchResult[]> {
    try {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '5',
        addressdetails: '1',
      });

      const response = await fetch(`${this.nominatimUrl}?${params.toString()}`, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Nominatim API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      this.logger.error(`Geocoding search failed for address: ${address}`, error);
      return [];
    }
  }

  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    try {
      const params = new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
        addressdetails: '1',
      });

      const response = await fetch(`${this.nominatimUrl}?${params.toString()}`, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Nominatim API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (!data || data.length === 0) {
        this.logger.warn(`No geocoding results for address: ${address}`);
        return null;
      }

      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
      };
    } catch (error) {
      this.logger.error(`Geocoding failed for address: ${address}`, error);
      return null;
    }
  }
}
