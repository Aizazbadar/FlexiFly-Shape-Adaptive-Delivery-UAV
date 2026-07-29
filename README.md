# ShapeShifter Drone Simulator

A drone simulation system that mimics real-life flight behavior. It features realistic controls, live data readouts, and the ability to change the drone's physical shape for different tasks. You can use this for testing drone software, training pilots, or experimenting with flight logic without needing a real drone.


## What This Project Does

This simulator lets you fly a virtual quadcopter drone in your browser. You can control it manually with your keyboard, or let it fly itself on an automatic mission. The drone changes its body shape depending on what it is doing -- spreading wide to grab packages, folding tight for speed, and shifting into precise mode for careful movements.

The dashboard shows you everything a real drone pilot would see: battery voltage, motor RPM, GPS coordinates, altitude, wind conditions, and much more. You can export all this data as a JSON file for analysis.

This simulation was done to give an idea of my final year project of shape shifter drone


## Features

### Flight Controls
- Manual control using arrow keys (throttle, pitch, roll, yaw)
- Automatic pilot mode that follows waypoints
- Quick action buttons for common commands like fly to package, fly to target, return to base
- Emergency controls for landing and returning home
- Four flight modes: MANUAL, AUTO, STABILIZE, RTH (Return to Home)

### Shape-Shifting Modes
The drone can change its shape for different jobs:

- **Standard**: Default mode. All-around performance with normal speed, efficiency, and grip range.
- **Wide-Grasp**: Spreads wider to grab packages. Slower but can hold larger items from farther away.
- **Precision**: Tight configuration for accuracy. Good efficiency and control for detailed work.
- **Compact**: Folds up for maximum speed. Great for racing or quick deliveries, but carries less.

### Telemetry Dashboard
The dashboard shows live data from every part of the drone:

- **Throttle**: How much power the motors are getting (0 to 100 percent)
- **Attitude**: Pitch, roll, and yaw angles (tilt and rotation)
- **Heading**: Compass direction in degrees
- **Speed**: How fast the drone is moving sideways (ground speed) and up/down (vertical speed)
- **GPS Position**: Realistic latitude and longitude with simulated GPS drift and satellite count
- **Altitude**: Height above the starting point, measured by simulated barometer
- **Distance from base**: How far the drone is from where it took off
- **Motor RPM**: Each motor's speed from 0 to 15,000 RPM with temperature readout
- **Motor temperatures**: Color-coded warnings (green=good, yellow=warm, red=too hot)
- **Battery**: 4S LiPo with individual cell voltages, total voltage, current draw, power in watts, and charge percentage
- **Wind**: Simulated wind speed and direction that affects flight behavior
- **Environment**: Temperature, air pressure, and humidity
- **IMU Sensors**: 3-axis accelerometer, gyroscope, and magnetometer data
- **Flight controller**: CPU load, loop speed, current flight mode, and failsafe status

### Auto-Pilot Mission
Click one button and the drone runs a complete mission on its own:

1. Checks all systems
2. Arms the motors
3. Takes off automatically
4. Flies to the package location
5. Switches to Wide-Grasp mode
6. Grabs the package
7. Switches to Compact mode for speed
8. Flies to the delivery target
9. Switches to Precision mode
10. Releases the package
11. Returns to base
12. Switches back to Standard mode
13. Lands automatically



## How to Get Started

### Requirements
- Node.js version 18 or newer
- npm or yarn package manager
- Any modern browser (Chrome, Firefox, Edge, Safari)

### Setup

1. Get the code:
   git clone https://github.com/yourusername/shapeshifter-drone.git
   cd shapeshifter-drone

2. Install dependencies:
   npm install

3. Start the dev server:
   npm run dev

4. Open your browser and go to http://localhost:5173

5. Build for production (optional):
   npm run build
   npm run preview

---

## How to Use

### Flying Manually
1. Click the "ARM MOTORS" button
2. Click "TAKE OFF" to lift off
3. Use arrow keys to move around
4. Change shape mode from the dropdown
5. Fly near a package and click grasp to pick it up
6. Click "LAND" to come down

### Running an Auto Mission
Click "START AUTO SIMULATION" and watch the drone do everything by itself.

### Quick Actions
If you are flying manually, you can still use quick buttons to fly to the package, fly to the delivery target, or return to base instantly.

---

## Technical Details

### Flight Physics
- Maximum speed: 25 m/s (about 90 km/h)
- Maximum altitude: 120 meters
- Battery: 5000 mAh 4S LiPo (14.8V nominal)
- Flight time: roughly 20 minutes depending on shape mode and conditions
- Signal range: 500 meters from base station
- Maximum payload: 5 kg
- Drone weight: 1.2 kg

### How Physics Is Simulated
- Battery drains based on throttle, speed, distance, shape mode, wind, and whether a package is carried
- Signal strength drops with distance and altitude but never goes below 40 percent
- Wind adds load to motors and affects flight
- Motor temperatures rise with RPM and cool down when idling
- Each motor runs independently with realistic RPM ranges

### Sensor Accuracy (Simulated)
- GPS: about plus or minus 1.5 meters
- Altitude: about plus or minus 0.5 meters
- Attitude angles: about plus or minus 0.1 degrees
- Temperature: about plus or minus 1 degree Celsius
- Heading: about plus or minus 2 degrees

### Control Loop
The simulation updates 10 times per second. Each update takes about 250 to 300 microseconds, similar to a real flight controller.

---

## Configuration

You can change mission waypoints and physics parameters in the source code:

- Package position and target position are in the mission setup
- Motor RPM ranges and throttle limits are adjustable
- Shape mode multipliers for speed, efficiency, and grasp range can be tuned

---

## Telemetry Data Format

Each export is a JSON object containing:

- timestamp: when the data was recorded
- position: x, y, and altitude coordinates
- gps: latitude, longitude, accuracy, and satellite count
- orientation: pitch, roll, yaw, and heading
- velocity: ground speed and vertical speed
- power: voltage, current, watts, battery percentage, and individual cell voltages
- motors: rpm array and temperatures array for all 4 motors
- environment: wind speed and direction, temperature, pressure, humidity
- sensors: 3-axis accelerometer, gyroscope, and magnetometer readings
- flightController: CPU load, loop time, mode, and failsafe status
- stats: flight time, max altitude, throttle level
- shapeMode: current shape configuration
- graspMode: whether grasp is active
- packageGrabbed: whether a package is being carried

---

## Built With

- React 19.1 for the user interface
- Vite 7.1 for fast development and builds
- Tailwind CSS 4.1 for styling
- Lucide React for icons

---

## Use Cases

### Research and Development
Test new flight algorithms before putting them on real hardware. Validate navigation logic and tune PID controllers without risk.

### Training and Education
Teach people how drones work without buying expensive hardware. Great for classrooms and self-study.

### Commercial Applications
Practice delivery route planning, test package handling workflows, and train fleet operators.

### Compliance and Documentation
Generate flight logs for regulatory submissions. Test safety procedures and reconstruct scenarios for incident analysis.

