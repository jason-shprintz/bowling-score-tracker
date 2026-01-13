// Data Service - Local and cloud data persistence
// This will be implemented in task 4.1

import { GameSession, User } from '@/types';

export class DataService {
  // Local storage methods
  async saveGameSession(session: GameSession): Promise<void> {
    // Implementation will be added in task 4.1
    throw new Error('Not implemented yet');
  }

  async getGameSessions(): Promise<GameSession[]> {
    // Implementation will be added in task 4.1
    throw new Error('Not implemented yet');
  }

  async saveUser(user: User): Promise<void> {
    // Implementation will be added in task 4.1
    throw new Error('Not implemented yet');
  }

  async getUser(): Promise<User | null> {
    // Implementation will be added in task 4.1
    throw new Error('Not implemented yet');
  }

  // Cloud sync methods
  async syncToCloud(): Promise<void> {
    // Implementation will be added in task 4.2
    throw new Error('Not implemented yet');
  }

  async syncFromCloud(): Promise<void> {
    // Implementation will be added in task 4.2
    throw new Error('Not implemented yet');
  }
}
