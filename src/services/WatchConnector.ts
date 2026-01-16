// Watch Connector Service - Smartwatch integration
// This will be implemented in task 10.1

import {
  WatchConnectorInterface,
  GameSession,
  HapticType,
  PinState,
} from '../types';

export class WatchConnector implements WatchConnectorInterface {
  isConnected(): boolean {
    // Implementation will be added in task 10.1
    throw new Error('Not implemented yet');
  }

  sendGameState(session: GameSession): void {
    // Implementation will be added in task 10.3
    throw new Error('Not implemented yet');
  }

  onScoreReceived: (
    callback: (frameIndex: number, pins: PinState[]) => void
  ) => void = () => {
    // Implementation will be added in task 10.2
    throw new Error('Not implemented yet');
  };

  sendHapticFeedback(type: HapticType): void {
    // Implementation will be added in task 10.2
    throw new Error('Not implemented yet');
  }
}
