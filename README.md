# Log4YM

Modern amateur radio logging application with a plugin-based architecture.

## Features

- **Modular Plugin System**: Drag-and-drop dockable panels
- **Real-time Updates**: SignalR for live data sync
- **DX Cluster Integration**: UDP multicast cluster spots
- **CAT Control**: Rig and rotator integration
- **Modern UI**: Glassmorphic dark theme with FlexLayout docking

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + FlexLayout
- **Backend**: ASP.NET Core 8 + SignalR
- **Database**: MongoDB
- **Real-time**: SignalR WebSocket

## Quick Start

### Using Docker Compose

```bash
docker-compose up -d
```

Access at http://localhost:5000

### Development Mode

```bash
# Start MongoDB and backend
docker-compose -f docker-compose.dev.yml up -d mongodb log4ym

# Start frontend with hot reload
cd src/Log4YM.Web
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5001

### Manual Setup

```bash
# Backend
cd src/Log4YM.Server
dotnet run

# Frontend
cd src/Log4YM.Web
npm install
npm run dev
```

## Project Structure

```
Log4YM/
├── src/
│   ├── Log4YM.Server/      # ASP.NET Core backend
│   ├── Log4YM.Contracts/   # Shared types
│   └── Log4YM.Web/         # React SPA
│       └── src/
│           ├── plugins/    # UI plugins
│           ├── components/ # Shared components
│           ├── hooks/      # React hooks
│           └── api/        # API client
├── docs/
│   └── prds/               # Product requirements
└── docker-compose.yml
```

## Core Plugins

- **Log Entry**: QSO entry with callsign lookup
- **Log History**: Searchable QSO log
- **DX Cluster**: Real-time DX spots
- **Map & Rotator**: Globe visualization with rotator control

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| MongoDB__ConnectionString | mongodb://localhost:27017 | MongoDB connection |
| MongoDB__DatabaseName | log4ym | Database name |

## License

MIT
