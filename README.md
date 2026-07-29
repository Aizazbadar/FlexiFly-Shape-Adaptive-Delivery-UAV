# 🚁 ShapeShifter Drone Simulator

A high-fidelity drone simulation system with realistic flight dynamics, professional-grade telemetry, and adaptive shape-shifting capabilities. Built for testing, training, and validating real-world drone systems.

![Drone Simulator](https://img.shields.io/badge/status-active-success)
![React](https://img.shields.io/badge/React-19.1-blue)
![Vite](https://img.shields.io/badge/Vite-7.1-purple)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-cyan)

## 🌟 Features

### 🎮 Flight Control System
- **Manual Control**: Direct throttle, pitch, roll, and yaw control with arrow keys
- **Auto-Pilot Mode**: Intelligent waypoint navigation with path planning
- **Quick Actions**: One-click commands (Fly to Package, Fly to Target, Return to Base)
- **Emergency Controls**: Instant landing and return-to-home functionality
- **Flight Modes**: MANUAL, AUTO, STABILIZE, RTH (Return to Home)

### 🔄 Shape-Shifting Technology
Transform the drone's configuration for different mission requirements:

| Mode | Speed | Efficiency | Grasp Range | Best For |
|------|-------|-----------|-------------|----------|
| **Standard** | 100% | 100% | 10 units | General purpose, balanced |
| **Wide-Grasp** | 70% | 90% | 15 units | Package pickup, heavy loads |
| **Precision** | 85% | 110% | 8 units | Detailed inspection, accuracy |
| **Compact** | 130% | 80% | 6 units | Speed delivery, racing |

### 📊 Professional Telemetry Dashboard

#### Core Flight Data
- **Throttle Control**: 0-100% power output with real-time feedback
- **Attitude System**: Pitch, roll, yaw (-45° to +45°) with gyroscopic stabilization
- **Heading**: 0-360° compass bearing with magnetometer fusion
- **Velocities**: 
  - Vertical speed (climb/descent rate m/s)
  - Ground speed (horizontal velocity m/s)
  - Airspeed converted to km/h

#### GPS & Navigation System
- **Real-time Coordinates**: Latitude/Longitude with realistic GPS drift
- **GPS Accuracy**: ±1.2-1.8m precision (typical consumer GPS)
- **Satellite Lock**: 8-16 satellites tracked with signal quality
- **Distance Tracking**: Real-time distance calculation from base station
- **Multi-constellation**: GPS + GLONASS simulation

#### Power System Monitoring
- **4x Individual Motor RPM**: 0-15,000 RPM per motor with load balancing
- **Motor Temperatures**: 25-85°C with color-coded overheat warnings
  - Green: < 50°C (optimal)
  - Yellow: 50-70°C (warm)
  - Red: > 70°C (critical)
- **Battery System**:
  - 4S LiPo configuration (14.0-16.8V)
  - Individual cell voltage monitoring
  - Real-time voltage drop under load
  - Current draw monitoring (0-30A)
  - Power consumption (Watts)
  - Battery percentage with failsafe warnings

#### Environmental Sensors
- **Wind Simulation**: 
  - Dynamic speed variation (0-15 m/s)
  - 360° direction with realistic effects on flight
- **Temperature**: Altitude-compensated (drops 0.15°C per meter)
- **Barometric Pressure**: Altitude sensing using barometric formula (hPa)
- **Humidity**: Environmental moisture percentage

#### IMU (Inertial Measurement Unit)
- **Accelerometer**: 3-axis acceleration (m/s²) with gravity compensation
- **Gyroscope**: 3-axis rotation rate (rad/s) for attitude estimation
- **Magnetometer**: 3-axis magnetic field (μT) for heading reference

#### Flight Controller Statistics
- **CPU Load**: Real-time processor utilization (15-50%)
- **Loop Time**: Control loop execution time (250-300μs)
- **Flight Mode Indicator**: MANUAL/AUTO/RTH status
- **Failsafe System**: 
  - LOW_BATTERY (< 20%)
  - WEAK_SIGNAL (< 50%)
  - MAX_ALT (> 120m)
  - OK (all systems nominal)

### 📈 Flight Statistics
- **Total Flight Time**: Cumulative flight duration tracking
- **Maximum Altitude Reached**: Peak altitude recorder
- **Distance Traveled**: Total distance from base
- **Mission Status**: Real-time mission log with timestamps

### 💾 Data Export & Analysis
Export complete telemetry data as JSON for:
- **Flight Controller Calibration**: PID tuning data
- **Machine Learning**: Training datasets for autonomous systems
- **Performance Analysis**: Post-flight review
- **Regulatory Compliance**: Flight logs for FAA/EASA documentation
- **Research & Development**: Algorithm validation

**Export Format Includes:**
- Position & GPS coordinates
- Full orientation data (pitch, roll, yaw)
- Velocity vectors
- Power system metrics
- Motor performance data
- Environmental conditions
- IMU sensor readings
- Flight controller stats
- Mission logs

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/shapeshifter-drone.git
cd shapeshifter-drone
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Build for Production
```bash
npm run build
npm run preview
```

## 🎯 Usage Guide

### Manual Flight Mode
1. **Arm Motors**: Click "ARM MOTORS" button
2. **Take Off**: Click "TAKE OFF" to begin flight
3. **Manual Controls**:
   - **↑ ↓ ← →**: Directional movement
   - **Center Button (●)**: Return to base instantly
   - Controls only work when flying
4. **Change Shape Mode**: Select from Standard/Wide-Grasp/Precision/Compact
5. **Grasp System**: 
   - Must be within 10 units of package
   - Click grasp when near target
6. **Monitor Telemetry**: Watch real-time flight data
7. **Land**: Click "LAND" button to descend

### Auto-Pilot Mission
1. Click **"START AUTO SIMULATION"**
2. Watch the autonomous mission:
   - ✅ System initialization
   - ⚡ Motor arming
   - 🚀 Automatic takeoff
   - 🎯 Navigate to package location
   - 🔄 Morph to Wide-Grasp mode
   - 📦 Grasp package autonomously
   - 🔄 Morph to Compact mode (speed)
   - ✈️ Fly to delivery target
   - 🔄 Morph to Precision mode
   - 📤 Release package
   - 🏠 Return to base
   - 🔄 Morph to Standard mode
   - 🛬 Automatic landing
   - ✅ Mission complete

### Quick Actions (Manual Override)
- **Fly to Package**: Navigate directly to pickup point
- **Fly to Target**: Navigate to delivery location
- **Return to Base**: Emergency return-to-home
- **Set Delivery Target**: Update target coordinates

### Data Export
1. Fly a mission (manual or auto)
2. Click **"Export Data"** button
3. JSON file downloads with complete telemetry
4. Use for analysis or training

## 📐 Technical Specifications

### Flight Dynamics
- **Max Speed**: 25 m/s (90 km/h)
- **Max Altitude**: 120m (regulatory limit)
- **Battery**: 5000 mAh 4S LiPo (14.8V nominal)
- **Flight Time**: ~20 minutes (varies by mode & conditions)
- **Signal Range**: 500m from base station
- **Max Payload**: 5kg
- **Weight**: 1.2kg (drone body)
- **Rotor Configuration**: Quadcopter (4 motors)

### Physics Simulation
- **Realistic Battery Drain**:
  - Base consumption: 2.5A idle, up to 25A full throttle
  - Affected by throttle level
  - Current speed impact
  - Distance from base
  - Shape mode efficiency
  - Wind resistance
  - Grasp mechanism (adds 1.5A)
- **Signal Strength**:
  - Degrades with distance (0.12% per unit)
  - Altitude loss (0.05% per meter)
  - Min 40% signal maintained
- **Environmental Effects**:
  - Wind affects motor load
  - Temperature drops with altitude
  - Pressure-based altitude sensing
- **Motor Physics**:
  - Individual motor load simulation
  - Temperature increase with RPM
  - Realistic RPM ranges (3000-15000)

### Sensor Accuracy
- **GPS**: ±1.5m horizontal accuracy (CEP)
- **Altitude**: ±0.5m vertical accuracy (barometric)
- **Attitude**: ±0.1° precision (IMU fusion)
- **Temperature**: ±1°C accuracy
- **Heading**: ±2° compass accuracy

### Control Loop
- **Update Rate**: 10Hz (100ms intervals)
- **Loop Time**: 250-300μs typical
- **PID Control**: Simulated stabilization
- **Sensor Fusion**: IMU + GPS + Barometer

## 🔧 Configuration

### Customization
Edit `src/App.jsx` to modify:

**Mission Waypoints:**
```javascript
const packagePosition = { x: 30, y: 40 };
const targetPosition = { x: 90, y: 20 };
```

**Physics Parameters:**
```javascript
const baseRPM = 3000;
const maxRPM = 15000;
const maxThrottle = 100;
```

**Shape Mode Multipliers:**
```javascript
case 'compact': return { speed: 1.3, efficiency: 1.1, grasp: 0.5 };
```

## 📊 Telemetry Data Format

```json
{
  "timestamp": "2025-11-19T10:30:00.000Z",
  "position": { "x": 30.5, "y": 40.2, "altitude": 50.0 },
  "gps": { 
    "lat": 37.774900, 
    "lon": -122.419400, 
    "accuracy": 1.5,
    "satellites": 12
  },
  "orientation": { 
    "pitch": 2.5, 
    "roll": -1.2, 
    "yaw": 45.8,
    "heading": 45.0
  },
  "velocity": { 
    "ground": 8.5, 
    "vertical": 0.2 
  },
  "power": { 
    "voltage": 15.6, 
    "current": 12.3,
    "watts": 191.88,
    "battery": 85,
    "cells": [3.9, 3.9, 3.9, 3.9]
  },
  "motors": {
    "rpm": [14500, 14550, 14480, 14520],
    "temperatures": [45, 46, 44, 47]
  },
  "environment": {
    "wind": { "speed": 2.3, "direction": 135 },
    "temperature": 22.5,
    "pressure": 1013.25,
    "humidity": 65
  },
  "sensors": {
    "acceleration": { "x": 0.2, "y": -0.1, "z": 9.81 },
    "gyroscope": { "x": 0.044, "y": -0.021, "z": 0.001 },
    "magnetometer": { "x": 25.3, "y": -18.7, "z": 42.1 }
  },
  "flightController": {
    "cpuLoad": 35,
    "loopTime": 275,
    "mode": "AUTO",
    "failsafe": "OK"
  },
  "stats": {
    "flightTime": 125.5,
    "maxAltitude": 52.3,
    "throttle": 62
  },
  "shapeMode": "compact",
  "graspMode": true,
  "packageGrabbed": true
}
```

## 🛠️ Built With

- **React 19.1** - UI framework with hooks
- **Vite 7.1** - Lightning-fast build tool
- **Tailwind CSS 4.1** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **@tailwindcss/postcss** - PostCSS plugin for Tailwind v4

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎓 Use Cases

### Research & Development
- Test flight algorithms before hardware deployment
- Validate autonomous navigation logic
- PID controller tuning and optimization
- Mission planning validation

### Training & Education
- Pilot training without hardware risk
- Drone physics education
- Control systems learning
- Mission scenario practice

### Commercial Applications
- Delivery route optimization
- Package handling simulation
- Multi-point delivery testing
- Fleet management training

### Compliance & Documentation
- Generate flight logs for regulatory bodies
- Safety protocol testing
- Risk assessment simulation
- Incident reconstruction

## 🐛 Known Limitations

- Wind simulation is simplified (no turbulence or gusts)
- GPS drift is randomized (not based on real multipath effects)
- Motor dynamics are approximated (no prop wash simulation)
- No obstacle avoidance system
- 2D visualization (no 3D perspective)
- Single drone (no swarm support)

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Basic flight controls
- [x] Shape-shifting modes
- [x] Professional telemetry
- [x] Auto-pilot missions
- [x] Data export

### Phase 2 (In Progress)
- [ ] 3D visualization with Three.js
- [ ] Obstacle detection and avoidance
- [ ] Advanced wind simulation with turbulence
- [ ] FPV camera view
- [ ] Mission planner with drag-drop waypoints

### Phase 3 (Planned)
- [ ] Multi-drone swarm coordination
- [ ] SLAM mapping integration
- [ ] Real-time video feed simulation
- [ ] Hardware-in-the-loop (HIL) support
- [ ] MAVLink protocol implementation
- [ ] Integration with PX4/ArduPilot

### Phase 4 (Future)
- [ ] AI-powered obstacle avoidance
- [ ] Computer vision payload simulation
- [ ] Weather system integration
- [ ] Multi-user collaboration
- [ ] VR/AR support

## 📚 Documentation

- [User Manual](docs/USER_MANUAL.md) - Detailed usage guide
- [API Reference](docs/API.md) - Telemetry data structures
- [Developer Guide](docs/DEVELOPMENT.md) - Contributing guidelines
- [Physics Model](docs/PHYSICS.md) - Simulation equations

## 🏆 Acknowledgments

- Inspired by real-world drone control systems
- Physics models based on quadcopter dynamics
- Telemetry standards from MAVLink protocol
- Community feedback and testing

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/shapeshifter-drone/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/shapeshifter-drone/discussions)
- **Email**: your.email@example.com

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐!

---

**Made with ❤️ for the drone community**

*Professional-grade simulation for serious development*
