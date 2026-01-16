// Location Service - GPS and venue detection
// This will be implemented in task 6.1

import { LocationServiceInterface, Location, BowlingAlley } from '../types';

export class LocationService implements LocationServiceInterface {
  async getCurrentLocation(): Promise<Location> {
    // Implementation will be added in task 6.1
    throw new Error('Not implemented yet');
  }

  async detectBowlingAlley(location: Location): Promise<BowlingAlley | null> {
    // Implementation will be added in task 6.1
    throw new Error('Not implemented yet');
  }

  async getNearbyAlleys(
    location: Location,
    radius: number
  ): Promise<BowlingAlley[]> {
    // Implementation will be added in task 6.1
    throw new Error('Not implemented yet');
  }
}
