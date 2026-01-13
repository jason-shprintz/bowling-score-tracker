# Bowling Score Tracker

A React Native mobile application built with Expo that allows bowlers to track their scores, analyze performance data, and interact with the app through smartwatch integration.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── services/       # Business logic and external service integrations
├── types/          # TypeScript type definitions
├── utils/          # Utility functions and constants
└── hooks/          # Custom React hooks
```

## Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run clean:appledouble` - Remove Apple double files (._*)

### Technology Stack

- **Frontend**: React Native with Expo SDK 54+
- **Language**: TypeScript
- **Testing**: Jest with ts-jest
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Navigation**: React Navigation 6.x
- **State Management**: React Context API with useReducer
- **Local Storage**: AsyncStorage with SQLite
- **Location Services**: expo-location
- **Property-Based Testing**: fast-check

### Core Features (Planned)

- Bowling score tracking with pin selection interface
- League and open bowling modes
- Performance statistics and analytics
- Smartwatch integration (iOS Watch, Wear OS)
- Location-based venue detection
- Cloud synchronization
- Offline support

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the established project structure
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep components small and focused

### Testing

- Write unit tests for utility functions
- Write property-based tests for core business logic
- Use descriptive test names
- Aim for good test coverage

### Git Workflow

- Use meaningful commit messages
- Create feature branches for new functionality
- Keep commits focused and atomic

## Implementation Status

This project is currently in the setup phase. The core infrastructure, types, and project structure have been established. Individual features will be implemented according to the task list in `.kiro/specs/bowling-score-tracker/tasks.md`.

## License

This project is private and proprietary.