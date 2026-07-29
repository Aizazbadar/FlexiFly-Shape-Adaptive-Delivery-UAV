/**
 * Shape-Morphing Drone Control UI with Environment State Isolation
 * 
 * This application simulates a shape-morphing drone with comprehensive telemetry
 * and supports both indoor and outdoor flight environments with complete state isolation.
 * 
 * ENVIRONMENT STATE ISOLATION:
 * - Indoor and outdoor environments maintain completely separate states
 * - Switching environments saves current state and restores target environment state
 * - Each environment has its own:
 *   • Drone position, altitude, and velocity
 *   • Flight parameters (speed, battery, etc.)
 *   • PID controllers for stabilization
 *   • Flight path history
 *   • Physics constraints (speed, altitude, wind)
 * 
 * - States are automatically saved every 5 seconds during flight
 * - No cross-environment contamination or parameter conflicts
 * - GPS coordinates only updated in outdoor mode
 * - Indoor mode uses local positioning system
 * 
* This ensures seamless transitions between environments without losing progress
*/

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Radio, PlayCircle, PauseCircle, Camera, MapIcon, Globe, Building2, Crosshair, Wifi, Battery, Package, Zap, Navigation, Square, Play, Settings } from 'lucide-react';
import MapView from './components/MapView';
import Scene3D from './components/Scene3D';
import Drone3DMiniView from './components/Drone3DMiniView';
import ParametersPanel from './components/ParametersPanel';
import WaypointsPanel from './components/WaypointsPanel';
import { pixelToGPS, gpsToPixel, calculateGPSDistance, getTerrainElevation } from './utils/gpsUtils';
import { PRESET_LOCATIONS, getCurrentLocation } from './utils/gpsUtils';
import { INDOOR_BOUNDS, getEnvironmentPhysics, checkIndoorBounds, constrainToIndoorBounds, mapToSceneCoords, sceneToMapCoords, mapDistanceToMeters } from './utils/environmentUtils';

// PID Controller for stabilization
class PIDController {
  constructor(kp, ki, kd) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.previousError = 0;
    this.integral = 0;
  }

  compute(setpoint, measured, dt = 0.1) {
    const error = setpoint - measured;
    this.integral += error * dt;
    const derivative = (error - this.previousError) / dt;
    this.previousError = error;
    return this.kp * error + this.ki * this.integral + this.kd * derivative;
  }

  reset() {
    this.previousError = 0;
    this.integral = 0;
  }
}

function App() {
  // NEW: Drone Presets
  const dronePresets = [
    { 
      name: 'Racing', 
      icon: '🏎️',
      params: { maxSpeed: 50, batteryCapacity: 3000, motorPower: 400, windStrength: 5, gpsAccuracy: 2, signalRange: 300, payloadWeight: 0, maxAltitude: 100 }
    },
    { 
      name: 'Photography', 
      icon: '📸',
      params: { maxSpeed: 15, batteryCapacity: 8000, motorPower: 150, windStrength: 3, gpsAccuracy: 1, signalRange: 800, payloadWeight: 3, maxAltitude: 150 }
    },
    { 
      name: 'Delivery', 
      icon: '📦',
      params: { maxSpeed: 25, batteryCapacity: 5000, motorPower: 200, windStrength: 5, gpsAccuracy: 1.5, signalRange: 500, payloadWeight: 5, maxAltitude: 120 }
    },
    { 
      name: 'Inspection', 
      icon: '🔍',
      params: { maxSpeed: 10, batteryCapacity: 10000, motorPower: 100, windStrength: 2, gpsAccuracy: 0.5, signalRange: 1000, payloadWeight: 2, maxAltitude: 200 }
    }
  ];

  // Core state
  const [dronePosition, setDronePosition] = useState({ x: 10, y: 90 });
  const [packagePosition, setPackagePosition] = useState({ x: 50, y: 50 });
  const [targetPosition, setTargetPosition] = useState({ x: 85, y: 20 });
  const [altitude, setAltitude] = useState(0);
  const [flying, setFlying] = useState(false);
  const [armed, setArmed] = useState(false);
  const [throttle, setThrottle] = useState(0);
  const [shapeMode, setShapeMode] = useState('standard');
  const [graspMode, setGraspMode] = useState(false);
  const [packageGrabbed, setPackageGrabbed] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState('idle');
  const [morphProgress, setMorphProgress] = useState(0);
  const [autoSimulation, setAutoSimulation] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [missionLog, setMissionLog] = useState([]);
  const [baseLocation, setBaseLocation] = useState(null);
  const [mapCenterOn, setMapCenterOn] = useState(null);

  // Telemetry state
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [heading, setHeading] = useState(0);
  const [battery, setBattery] = useState(100);
  const [voltage, setVoltage] = useState(16.8);
  const [current, setCurrent] = useState(0);
  const [powerConsumption, setPowerConsumption] = useState(0);
  const [batteryCell, setBatteryCell] = useState([4.2, 4.2, 4.2, 4.2]);
  const [motorRPM, setMotorRPM] = useState([0, 0, 0, 0]);
  const [motorTemp, setMotorTemp] = useState([25, 25, 25, 25]);
  const [gpsCoordinates, setGpsCoordinates] = useState({ lat: 0, lon: 0 });
  const [gpsSatellites, setGpsSatellites] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState(0);
  const [flightPath, setFlightPath] = useState([]);
  const [signalStrength, setSignalStrength] = useState(100);
  const [groundSpeed, setGroundSpeed] = useState(0);
  const [verticalSpeed, setVerticalSpeed] = useState(0);
  const [windSpeed, setWindSpeed] = useState(0);
  const [windDirection, setWindDirection] = useState(0);
  const [temperature, setTemperature] = useState(22);
  const [pressure, setPressure] = useState(1013.25);
  const [humidity, setHumidity] = useState(60);
  const [terrainElevation, setTerrainElevation] = useState(0);
  const [failsafeStatus, setFailsafeStatus] = useState('OK');
  const [rotorRotation, setRotorRotation] = useState(0);
  const [totalFlightTime, setTotalFlightTime] = useState(0);
  const [maxAltitudeReached, setMaxAltitudeReached] = useState(0);
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 9.81 });
  const [gyroscope, setGyroscope] = useState({ x: 0, y: 0, z: 0 });
  const [magnetometer, setMagnetometer] = useState({ x: 0, y: 0, z: 0 });
  const [cpuLoad, setCpuLoad] = useState(0);
  const [loopTime, setLoopTime] = useState(0);

  // Parameters
  const [parameters, setParameters] = useState({
    maxSpeed: 25,
    batteryCapacity: 5000,
    motorPower: 200,
    windStrength: 5,
    gpsAccuracy: 1,
    signalRange: 500,
    payloadWeight: 2,
    maxAltitude: 120
  });

  // Refs for intervals and state snapshots
  const physicsStateRef = useRef(null);
  const missionStateRef = useRef(null);
  const autoSimulationRef = useRef(false);
  const shapeModeRef = useRef('standard');
  const altitudeIntervalRef = useRef(null);
  const moveToPositionRef = useRef(null);
  const handleShapeChangeRef = useRef(null);

  // NEW: Indoor/Outdoor and 3D View States
  const [isIndoor, setIsIndoor] = useState(false);
  const [indoorBounds, setIndoorBounds] = useState(INDOOR_BOUNDS.medium);
  const [view3D, setView3D] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [mapType, setMapType] = useState('satellite');

  // Flight mode indicator - computed from current state
  const flightMode = useMemo(() => {
    if (!armed) return 'STANDBY';
    if (!flying) return 'ARMED';
    if (autoSimulation) return 'AUTO';
    if (graspMode) return 'GRASP';
    return 'MANUAL';
  }, [armed, flying, autoSimulation, graspMode]);

  // Environment-specific state snapshots to prevent cross-environment conflicts
  const indoorStateRef = useRef({
    position: { x: 10, y: 90 },
    altitude: 0,
    velocity: { x: 0, y: 0 },
    pitch: 0,
    roll: 0,
    yaw: 0,
    heading: 0,
    battery: 100,
    totalFlightTime: 0,
    maxAltitudeReached: 0,
    flightPath: [],
    parameters: null // Will be initialized
  });

  const outdoorStateRef = useRef({
    position: { x: 10, y: 90 },
    altitude: 0,
    velocity: { x: 0, y: 0 },
    pitch: 0,
    roll: 0,
    yaw: 0,
    heading: 0,
    battery: 100,
    totalFlightTime: 0,
    maxAltitudeReached: 0,
    flightPath: [],
    parameters: null // Will be initialized
  });

  // PID Controllers for stabilization (separate for each environment)
  const indoorPIDRef = useRef({
    pitch: new PIDController(2.5, 0.15, 1.0),
    roll: new PIDController(2.5, 0.15, 1.0),
    yaw: new PIDController(2.0, 0.08, 0.7)
  });

  const outdoorPIDRef = useRef({
    pitch: new PIDController(2.0, 0.1, 0.8),
    roll: new PIDController(2.0, 0.1, 0.8),
    yaw: new PIDController(1.5, 0.05, 0.5)
  });

  // Active PID controllers based on environment
  const pitchPID = useRef(isIndoor ? indoorPIDRef.current.pitch : outdoorPIDRef.current.pitch);
  const rollPID = useRef(isIndoor ? indoorPIDRef.current.roll : outdoorPIDRef.current.roll);
  const yawPID = useRef(isIndoor ? indoorPIDRef.current.yaw : outdoorPIDRef.current.yaw);

  // Convert pixel positions to GPS coordinates (use baseLocation which is now set to user location by default)
  const effectiveBaseLocation = baseLocation || PRESET_LOCATIONS.sanFrancisco; // Fallback during initialization
  const droneGPS = pixelToGPS(dronePosition.x, dronePosition.y, effectiveBaseLocation);
  const baseGPS = effectiveBaseLocation;
  const packageGPS = pixelToGPS(packagePosition.x, packagePosition.y, baseGPS);
  const targetGPS = pixelToGPS(targetPosition.x, targetPosition.y, baseGPS);

  // Add log entry
  const addLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setMissionLog(prev => [...prev.slice(-5), `${timestamp}: ${message}`]);
  }, []);

  // Keep physics state ref synchronized with latest values for loops/intervals
  useEffect(() => {
    physicsStateRef.current = {
      altitude,
      armed,
      autoSimulation,
      battery,
      droneGPS,
      dronePosition,
      failsafeStatus,
      graspMode,
      heading,
      indoorBounds,
      isIndoor,
      motorRPM,
      parameters,
      pitch,
      roll,
      signalStrength,
      terrainElevation,
      throttle,
      velocity,
      verticalSpeed,
      yaw
    };
  }, [
    altitude,
    armed,
    autoSimulation,
    battery,
    droneGPS,
    dronePosition,
    failsafeStatus,
    graspMode,
    heading,
    indoorBounds,
    isIndoor,
    motorRPM,
    parameters,
    pitch,
    roll,
    signalStrength,
    terrainElevation,
    throttle,
    velocity,
    verticalSpeed,
    yaw
  ]);

  // Keep mission sequence state in sync for automation routines
  useEffect(() => {
    missionStateRef.current = {
      altitude,
      dronePosition,
      totalFlightTime,
      maxAltitudeReached,
      targetPosition,
      packagePosition,
      indoorBounds,
      isIndoor
    };
  }, [
    altitude,
    dronePosition,
    totalFlightTime,
    maxAltitudeReached,
    targetPosition,
    packagePosition,
    indoorBounds,
    isIndoor
  ]);

  // Get user's location on app startup
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        addLog('🌍 Initializing GPS system...');
  const location = await getCurrentLocation();
        setBaseLocation({ lat: location.lat, lon: location.lon, name: 'Your Location' });
        setUseCurrentLocation(true);
        addLog(`✅ Base station set at: ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`);
        addLog(`📡 GPS accuracy: ±${location.accuracy.toFixed(0)}m`);
        
        // Center map on user's location
        setMapCenterOn('base');
        setTimeout(() => setMapCenterOn(null), 100);
      } catch (error) {
        console.warn('Location initialization failed:', error);
        // Fallback to San Francisco if location fails
        setBaseLocation(PRESET_LOCATIONS.sanFrancisco);
        setUseCurrentLocation(false);
        addLog(`⚠️ Using default location (San Francisco)`);
        addLog(`💡 Enable location to use your real position`);
      }
    };
    initializeLocation();
  }, []); // Run once on mount

  // Handle parameter changes with environment awareness
  const handleParameterChange = (param, value) => {
    setParameters(prev => ({ ...prev, [param]: value }));
    
    // Update the current environment's state reference
    const currentEnv = isIndoor ? 'indoor' : 'outdoor';
    const stateRef = isIndoor ? indoorStateRef : outdoorStateRef;
    if (stateRef.current.parameters) {
      stateRef.current.parameters[param] = value;
    }
    
    addLog(`⚙️ ${currentEnv.toUpperCase()}: ${param} = ${value}`);
  };

  // Handle preset selection with environment awareness
  const handlePresetSelect = (preset) => {
    // Apply preset but respect environment-specific limits
    const envPhysics = getEnvironmentPhysics(isIndoor, indoorBounds);
    const newParams = {
      ...preset.params,
      // Override with environment constraints
      maxSpeed: Math.min(preset.params.maxSpeed, envPhysics.maxSpeed),
      maxAltitude: Math.min(preset.params.maxAltitude, envPhysics.maxAltitude),
      windStrength: isIndoor ? 0 : preset.params.windStrength,
      gpsAccuracy: isIndoor ? envPhysics.gpsAccuracy : preset.params.gpsAccuracy
    };

    setParameters(newParams);
    
    // Update current environment's state reference
    const stateRef = isIndoor ? indoorStateRef : outdoorStateRef;
    stateRef.current.parameters = newParams;
    
    const envNote = isIndoor ? ' (adjusted for indoor limits)' : '';
    addLog(`🎯 Preset loaded: ${preset.name}${envNote}`);
  };

  // Update flight path with GPS coordinates (throttled for performance)
  useEffect(() => {
    if (flying) {
      const interval = setInterval(() => {
        setFlightPath(prev => {
          const lastPoint = prev[prev.length - 1];
          // Only add new point if position changed significantly
          if (!lastPoint || 
              Math.abs(lastPoint.lat - droneGPS.lat) > 0.000001 || 
              Math.abs(lastPoint.lon - droneGPS.lon) > 0.000001) {
            return [...prev.slice(-100), { lat: droneGPS.lat, lon: droneGPS.lon, alt: altitude }]; // Keep last 100 points
          }
          return prev;
        });
      }, 500); // Update every 500ms
      
      return () => clearInterval(interval);
    }
  }, [flying, droneGPS, altitude]);

  // Update terrain elevation
  useEffect(() => {
    const elevation = getTerrainElevation(droneGPS);
    setTerrainElevation(elevation);
  }, [droneGPS]);

  // Get current user location
  const handleGetCurrentLocation = async () => {
    try {
      addLog('📍 Getting current location...');
  const location = await getCurrentLocation();
      setBaseLocation({ lat: location.lat, lon: location.lon, name: 'Current Location' });
      setUseCurrentLocation(true);
      
      // Reset drone to base position when switching location
      setDronePosition({ x: 10, y: 90 });
      setAltitude(0);
      setFlying(false);
      setArmed(false);
      
      // Center map on new location with zoom
      setMapCenterOn('base');
      setTimeout(() => setMapCenterOn(null), 100); // Reset after centering
      
      addLog(`✅ Location: ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)} (±${location.accuracy.toFixed(0)}m)`);
    } catch (error) {
      console.warn('Location request failed:', error);
      addLog(`❌ Location error: ${error.message}`);
    }
  };

  // Save current state to environment snapshot
  const saveEnvironmentState = (environment) => {
    const stateRef = environment === 'indoor' ? indoorStateRef : outdoorStateRef;
    stateRef.current = {
      position: { ...dronePosition },
      altitude: altitude,
      velocity: { ...velocity },
      pitch: pitch,
      roll: roll,
      yaw: yaw,
      heading: heading,
      battery: battery,
      totalFlightTime: totalFlightTime,
      maxAltitudeReached: maxAltitudeReached,
      flightPath: [...flightPath],
      parameters: { ...parameters }
    };
  };

  // Restore state from environment snapshot
  const restoreEnvironmentState = (environment) => {
    const stateRef = environment === 'indoor' ? indoorStateRef : outdoorStateRef;
    const state = stateRef.current;
    
    // Only restore if state was previously saved
    if (state.parameters) {
      setDronePosition(state.position);
      setAltitude(state.altitude);
      setVelocity(state.velocity);
      setPitch(state.pitch);
      setRoll(state.roll);
      setYaw(state.yaw);
      setHeading(state.heading);
      setBattery(state.battery);
      setTotalFlightTime(state.totalFlightTime);
      setMaxAltitudeReached(state.maxAltitudeReached);
      setFlightPath(state.flightPath);
      setParameters(state.parameters);
    }
  };

  // Initialize environment states on mount
  useEffect(() => {
    const indoorPhysics = getEnvironmentPhysics(true, indoorBounds);
    const outdoorPhysics = getEnvironmentPhysics(false);
    
    indoorStateRef.current.parameters = {
      maxSpeed: indoorPhysics.maxSpeed,
      batteryCapacity: 5000,
      motorPower: 150,
      windStrength: indoorPhysics.windStrength,
      gpsAccuracy: indoorPhysics.gpsAccuracy,
      signalRange: indoorPhysics.signalStrength * 10,
      payloadWeight: 2,
      maxAltitude: indoorPhysics.maxAltitude
    };

    outdoorStateRef.current.parameters = {
      maxSpeed: outdoorPhysics.maxSpeed,
      batteryCapacity: 5000,
      motorPower: 200,
      windStrength: outdoorPhysics.windStrength,
      gpsAccuracy: outdoorPhysics.gpsAccuracy,
      signalRange: outdoorPhysics.signalStrength * 10,
      payloadWeight: 2,
      maxAltitude: outdoorPhysics.maxAltitude
    };
  }, [indoorBounds]);

  // Toggle indoor/outdoor mode with state isolation
  const handleEnvironmentToggle = () => {
    const currentEnv = isIndoor ? 'indoor' : 'outdoor';
    const newMode = !isIndoor;
    const newEnv = newMode ? 'indoor' : 'outdoor';
    
    addLog(`🔄 Switching from ${currentEnv.toUpperCase()} to ${newEnv.toUpperCase()} mode...`);
    
    // Save current environment state
    saveEnvironmentState(currentEnv);
    addLog(`💾 ${currentEnv.toUpperCase()} state saved`);
    
    // Clean up any active intervals from current environment
    if (altitudeIntervalRef.current) {
      clearInterval(altitudeIntervalRef.current);
      altitudeIntervalRef.current = null;
    }
    if (moveToPositionRef.current) {
      clearInterval(moveToPositionRef.current);
      moveToPositionRef.current = null;
    }
    
    // Stop auto-simulation if running
    if (autoSimulation) {
      setAutoSimulation(false);
      setSimulationStep(0);
      addLog(`⚠️ Auto-simulation stopped for environment switch`);
    }
    
    // Force landing if flying
    if (flying) {
      setFlying(false);
      setArmed(false);
      addLog(`⚠️ Auto-landing for environment transition`);
    }

    // Switch environment
    setIsIndoor(newMode);

    // Update active PID controllers
    pitchPID.current = newMode ? indoorPIDRef.current.pitch : outdoorPIDRef.current.pitch;
    rollPID.current = newMode ? indoorPIDRef.current.roll : outdoorPIDRef.current.roll;
    yawPID.current = newMode ? indoorPIDRef.current.yaw : outdoorPIDRef.current.yaw;

    // Restore the target environment state
    restoreEnvironmentState(newEnv);
    addLog(`📂 ${newEnv.toUpperCase()} state restored`);

    // Apply environment-specific physics if no saved state
    const envPhysics = getEnvironmentPhysics(newMode, indoorBounds);
    if (!outdoorStateRef.current.parameters && !newMode) {
      setParameters({
        maxSpeed: envPhysics.maxSpeed,
        batteryCapacity: 5000,
        motorPower: 200,
        windStrength: envPhysics.windStrength,
        gpsAccuracy: envPhysics.gpsAccuracy,
        signalRange: envPhysics.signalStrength * 10,
        payloadWeight: 2,
        maxAltitude: envPhysics.maxAltitude
      });
    } else if (!indoorStateRef.current.parameters && newMode) {
      setParameters({
        maxSpeed: envPhysics.maxSpeed,
        batteryCapacity: 5000,
        motorPower: 150,
        windStrength: envPhysics.windStrength,
        gpsAccuracy: envPhysics.gpsAccuracy,
        signalRange: envPhysics.signalStrength * 10,
        payloadWeight: 2,
        maxAltitude: envPhysics.maxAltitude
      });
    }

    addLog(`✅ Switched to ${newMode ? 'INDOOR' : 'OUTDOOR'} mode`);
    addLog(`📊 Environment: ${newMode ? indoorBounds.name : 'Open Air'}`);
  };

  // Toggle between 2D and 3D view
  const handleView3DToggle = () => {
    setView3D(prev => !prev);
    addLog(`🖼️ Switched to ${!view3D ? '3D' : '2D'} view`);
  };

  // Change indoor bounds preset with state preservation
  const handleIndoorBoundsChange = (key) => {
    const preset = INDOOR_BOUNDS[key];
    if (preset) {
      // Save current indoor state before changing bounds
      if (isIndoor) {
        saveEnvironmentState('indoor');
      }

      setIndoorBounds(preset);
      
      // Reset drone if flying (safety requirement for bounds change)
      if (flying && isIndoor) {
        setFlying(false);
        setArmed(false);
        setAltitude(0);
        addLog(`⚠️ Landed due to bounds change`);
      }
      
      // Reset only indoor PID controllers
      indoorPIDRef.current.pitch.reset();
      indoorPIDRef.current.roll.reset();
      indoorPIDRef.current.yaw.reset();
      
      // Only reset position if currently indoor
      if (isIndoor) {
        setDronePosition({ x: 10, y: 90 });
      }
      
      // Recalculate environment physics and update indoor state
      const envPhysics = getEnvironmentPhysics(true, preset);
      const newParams = {
        maxSpeed: envPhysics.maxSpeed,
        batteryCapacity: parameters.batteryCapacity,
        motorPower: parameters.motorPower,
        windStrength: envPhysics.windStrength,
        gpsAccuracy: envPhysics.gpsAccuracy,
        signalRange: envPhysics.signalStrength * 10,
        payloadWeight: parameters.payloadWeight,
        maxAltitude: envPhysics.maxAltitude
      };

      // Update indoor state reference
      indoorStateRef.current.parameters = newParams;

      // Apply to current state only if in indoor mode
      if (isIndoor) {
        setParameters(newParams);
      }

      addLog(`📐 Indoor bounds set to ${preset.name}`);
      addLog(`🎯 Max speed: ${envPhysics.maxSpeed}m/s, Max alt: ${envPhysics.maxAltitude}m`);
    }
  };

  // Shape mode effects on drone performance
  const getShapeMultipliers = useCallback(() => {
    // Use ref to avoid physics loop restart when shape changes
    const mode = shapeModeRef.current || 'standard';
    switch(mode) {
      case 'wide-grasp': return { speed: 0.7, efficiency: 0.8, grasp: 2.0 };
      case 'precision': return { speed: 0.85, efficiency: 0.95, grasp: 1.5 };
      case 'compact': return { speed: 1.3, efficiency: 1.1, grasp: 0.5 };
      default: return { speed: 1.0, efficiency: 1.0, grasp: 1.0 };
    }
  }, []);

  // Calculate distance between two points
  const calculateDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const baseDistanceMeters = useMemo(() => {
    return mapDistanceToMeters(
      dronePosition,
      { x: 10, y: 90 },
      { isIndoor, indoorBounds }
    );
  }, [dronePosition, isIndoor, indoorBounds]);

  const baseDistanceLabel = baseDistanceMeters >= 1000
    ? `${(baseDistanceMeters / 1000).toFixed(1)} km`
    : `${baseDistanceMeters.toFixed(0)} m`;

  const quickWaypoints = useMemo(() => (
    [
      { id: 'base', label: 'Base Station', x: 10, y: 90 },
      { id: 'package', label: 'Pickup', x: packagePosition.x, y: packagePosition.y },
      { id: 'target', label: 'Delivery Target', x: targetPosition.x, y: targetPosition.y },
      { id: 'drone', label: 'Current Position', x: dronePosition.x, y: dronePosition.y }
    ]
  ), [dronePosition, packagePosition, targetPosition]);

  // Advanced Physics simulation - runs continuously when flying
  // IMPORTANT: Only affects the CURRENT active environment (isIndoor state)
  useEffect(() => {
    if (!flying) {
      // Clean up intervals when landing
      if (altitudeIntervalRef.current) {
        clearInterval(altitudeIntervalRef.current);
        altitudeIntervalRef.current = null;
      }
      if (moveToPositionRef.current) {
        clearInterval(moveToPositionRef.current);
        moveToPositionRef.current = null;
      }
      
      setAltitude(0);
      setGroundSpeed(0);
      setVerticalSpeed(0);
      setVelocity({ x: 0, y: 0 });
      setThrottle(0);
      setPitch(0);
      setRoll(0);
      setMotorRPM([0, 0, 0, 0]);
      setCurrent(0);
      setPowerConsumption(0);
      setTotalFlightTime(0);
      // Reset failsafe when landed
      if (failsafeStatus !== 'OK') {
        setFailsafeStatus('OK');
      }
      return;
    }

    console.log(`🔄 Physics loop started: flying=${flying}, autoSim=${autoSimulation}, indoor=${isIndoor}, altitude=${altitude}m`);
    
    const physicsLoop = setInterval(() => {
      const multipliers = getShapeMultipliers();
      
      // Get environment-specific physics parameters
      const envPhysics = getEnvironmentPhysics(isIndoor, indoorBounds);
      
      // Flight time tracking
      setTotalFlightTime(prev => prev + 0.1);
      
      // Rotor animation - speed based on throttle
      const rotorSpeed = 10 + (throttle / 100) * 40;
      setRotorRotation(prev => (prev + rotorSpeed) % 360);
      
      // Motor RPM calculation (realistic quadcopter range: 0-15000 RPM)
      const baseRPM = armed ? 3000 : 0;
      const flightRPM = flying ? baseRPM + (throttle / 100) * 12000 : baseRPM;
      const windEffect = envPhysics.windStrength * 50; // Use environment wind
      setMotorRPM([
        Math.round(flightRPM + Math.random() * 200 + windEffect),
        Math.round(flightRPM + Math.random() * 200 - windEffect * 0.5),
        Math.round(flightRPM + Math.random() * 200 + windEffect * 0.3),
        Math.round(flightRPM + Math.random() * 200 - windEffect * 0.2)
      ]);
      
      // Motor temperature (increases with use, affected by shape mode)
      setMotorTemp(prev => prev.map((temp, i) => {
        const targetTemp = 25 + (motorRPM[i] / 15000) * 45 + (1 / multipliers.efficiency) * 10;
        return Math.min(temp + (targetTemp - temp) * 0.05, 85); // Max 85°C
      }));
      
      // Throttle management - DO NOT auto-adjust during autoSimulation (mission controls it explicitly)
      if (!autoSimulationRef.current) {
        // Only auto-manage in basic manual hover mode
        setThrottle(prev => {
          // If throttle is manually set (not 0 and not default 50), keep it
          if (prev !== 0 && prev !== 50) return prev;
          // Otherwise provide gentle hover assist
          const hoverThrottle = 50 + (altitude > 0 ? 5 : 0);
          return prev === 0 ? hoverThrottle : prev;
        });
      }
      // When autoSimulation is true, mission code controls throttle - don't interfere
      
      // Altitude physics with vertical speed - using environment max altitude
      // CRITICAL: During autoSimulation, mission code controls altitude directly via setInterval
      // Don't interfere with explicit altitude commands during missions
      if (!autoSimulationRef.current) {
        const climbRate = (throttle - 50) / 10; // m/s
        setVerticalSpeed(climbRate);
        setAltitude(prev => {
          const newAlt = Math.max(0, Math.min(prev + climbRate * 0.1, envPhysics.maxAltitude));
          setMaxAltitudeReached(max => Math.max(max, newAlt));
          console.log(`Manual altitude: ${prev.toFixed(2)}m -> ${newAlt.toFixed(2)}m (throttle: ${throttle})`);
          return newAlt;
        });
      } else {
        // During autoSimulation, only track vertical speed for display
        const climbRate = (throttle - 50) / 10;
        setVerticalSpeed(climbRate);
        // Altitude is controlled by mission steps - don't override
        setMaxAltitudeReached(max => Math.max(max, altitude));
        // Log every second to avoid spam
        if (Math.random() < 0.01) {
          console.log(`Auto-sim mode: altitude=${altitude.toFixed(2)}m, throttle=${throttle}, NOT updating from physics`);
        }
      }
      
      // Calculate speeds using environment maxSpeed
      const speedScale = envPhysics.maxSpeed / 25; // Scale relative to default 25 m/s
      const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y) * 10 * multipliers.speed * speedScale;
      setGroundSpeed(currentSpeed);
      
      // Pitch and Roll based on movement direction (affected by payload weight)
      const stabilityFactor = 1 + (parameters.payloadWeight / 10); // More weight = slower response
      const targetPitch = -velocity.y * 5 / stabilityFactor;
      const targetRoll = velocity.x * 5 / stabilityFactor;
      
      // Apply smooth transition instead of PID (which was causing runaway)
      setPitch(prev => {
        const diff = targetPitch - prev;
        return prev + diff * 0.3; // Smooth damping
      });
      setRoll(prev => {
        const diff = targetRoll - prev;
        return prev + diff * 0.3; // Smooth damping
      });
      
      // Yaw and Heading updates with smooth damping
      if (velocity.x !== 0 || velocity.y !== 0) {
        const targetHeading = (Math.atan2(velocity.x, -velocity.y) * 180 / Math.PI + 360) % 360;
        setHeading(prev => {
          const diff = (targetHeading - prev + 540) % 360 - 180;
          return (prev + diff * 0.1 + 360) % 360;
        });
        
        // Smooth yaw transition
        setYaw(prev => {
          const diff = (heading - prev + 540) % 360 - 180;
          return (prev + diff * 0.2 + 360) % 360;
        });
      }
      
      // Indoor bounds enforcement with proper margin
      if (isIndoor && !autoSimulationRef.current) {
        // ONLY apply collision detection in manual mode
        // During autoSimulation, mission code handles position control
        const { x: worldX, z: worldZ } = mapToSceneCoords(dronePosition, {
          isIndoor: true,
          indoorBounds
        });
        const dronePos3D = {
          x: worldX,
          y: altitude,
          z: worldZ
        };

        // Use larger margin to prevent false positives (0.5m margin)
        const boundsCheck = checkIndoorBounds(dronePos3D, indoorBounds, 0.5);
        
        // Only log and correct if there's an actual violation (not just proximity)
        if (!boundsCheck.withinBounds) {
          // Constrain position - returns 3D position in meters
          const constrained = constrainToIndoorBounds(dronePos3D, indoorBounds, 0.5);
          
          // Only update if significantly constrained
          const needsCorrection = 
            Math.abs(constrained.x - dronePos3D.x) > 0.01 ||
            Math.abs(constrained.y - dronePos3D.y) > 0.01 ||
            Math.abs(constrained.z - dronePos3D.z) > 0.01;
          
          if (needsCorrection) {
            // Convert back to map coordinates (0-100)
            setDronePosition(
              sceneToMapCoords(
                { x: constrained.x, z: constrained.z },
                { isIndoor: true, indoorBounds }
              )
            );
            // Only constrain altitude if it's a ceiling/floor violation
            if (boundsCheck.violations.y) {
              setAltitude(constrained.y);
            }
            
            // Log collision only once per second to avoid spam
            const now = Date.now();
            if (!window.lastCollisionLog || now - window.lastCollisionLog > 1000) {
              if (boundsCheck.violations.x) addLog('⚠️ Wall collision (X)');
              if (boundsCheck.violations.z) addLog('⚠️ Wall collision (Z)');
              if (boundsCheck.violations.y) {
                if (dronePos3D.y >= indoorBounds.height - 0.5) {
                  addLog('⚠️ Ceiling limit reached');
                } else if (dronePos3D.y <= 0.5) {
                  addLog('⚠️ Floor limit reached');
                }
              }
              window.lastCollisionLog = now;
            }
          }
        }
      }
      
      // GPS simulation - only update GPS coordinates for outdoor mode
      if (!isIndoor) {
        // Use actual GPS coordinates for outdoor environment
        setGpsCoordinates(droneGPS);
        setGpsSatellites(Math.max(8, Math.min(16, 12 + Math.floor(Math.random() * 5) - 2)));
      } else {
        // Indoor: use local positioning system (no real GPS)
        // GPS is less accurate indoors, simulate local positioning
        setGpsSatellites(Math.max(4, Math.min(8, 6 + Math.floor(Math.random() * 3) - 1)));
      }
      // GPS accuracy varies by environment
      setGpsAccuracy(envPhysics.gpsAccuracy * (0.8 + Math.random() * 0.4)); // ±20% variation
      
      // Power consumption - using adjustable motor power parameter
      const motorPowerScale = parameters.motorPower / 200; // Scale relative to default 200W
      const baseCurrent = armed ? 2.5 * motorPowerScale : 0.1; // Amperes
      const flightCurrent = flying ? baseCurrent + (throttle / 100) * 25 * motorPowerScale : baseCurrent;
      const windCurrent = (envPhysics.windStrength / 10) * 2; // Use environment wind
      const shapeCurrent = (1 / multipliers.efficiency) * 3;
      const payloadCurrent = parameters.payloadWeight * 0.5; // Current increases with payload
      const totalCurrent = flightCurrent + windCurrent + shapeCurrent + payloadCurrent + (graspMode ? 1.5 : 0);
      setCurrent(totalCurrent);
      
      // Voltage drop under load (4S LiPo: 16.8V full, 14.0V empty)
      const voltageDropUnderLoad = totalCurrent * 0.05;
      const batteryVoltage = 14.0 + (battery / 100) * 2.8 - voltageDropUnderLoad;
      setVoltage(batteryVoltage);
      
      // Cell voltages (4S configuration)
      const avgCellVoltage = batteryVoltage / 4;
      setBatteryCell([
        avgCellVoltage + (Math.random() - 0.5) * 0.05,
        avgCellVoltage + (Math.random() - 0.5) * 0.05,
        avgCellVoltage + (Math.random() - 0.5) * 0.05,
        avgCellVoltage + (Math.random() - 0.5) * 0.05
      ]);
      
      // Power consumption in Watts
      setPowerConsumption(voltageDropUnderLoad > 0 ? batteryVoltage * totalCurrent : 0);
      
      // Battery drain - using adjustable battery capacity and environment multiplier
      const capacityScale = parameters.batteryCapacity / 5000; // Scale relative to default 5000mAh
      const drainRate = (totalCurrent / 36000) / capacityScale * envPhysics.batteryDrainMultiplier; // Apply environment drain
      setBattery(prev => {
        const newBattery = Math.max(prev - drainRate, 0);
        
        // Battery warnings
        if (newBattery <= 20 && prev > 20) {
          addLog('⚠️ LOW BATTERY: 20% remaining!');
          setFailsafeStatus('LOW_BATTERY');
        }
        if (newBattery <= 10 && prev > 10) {
          addLog('🚨 CRITICAL BATTERY: 10% - Return to base!');
          setFailsafeStatus('CRITICAL_BATTERY');
        }
        if (newBattery <= 5 && prev > 5) {
          addLog('🚨 EMERGENCY: Auto-landing initiated!');
          setFailsafeStatus('EMERGENCY_LAND');
          // Auto-land
          setThrottle(0);
          setFlying(false);
          setArmed(false);
          if (autoSimulation) {
            setAutoSimulation(false);
          }
        }
        
        return newBattery;
      });
      
  // Signal degradation - using adjustable signal range
  const distanceFromBaseMeters = mapDistanceToMeters(
    dronePosition,
    { x: 10, y: 90 },
    { isIndoor, indoorBounds }
  );
  const maxRange = Math.max(parameters.signalRange, 1);
  const signalLoss = Math.min((distanceFromBaseMeters / maxRange) * 60, 50);
      const altitudeLoss = Math.min(altitude * 0.05, 10);
      setSignalStrength(Math.max(100 - signalLoss - altitudeLoss, 40));
      
      // Environmental simulation - using environment wind strength
      const windTarget = Math.max(0, Math.min(envPhysics.windStrength + (Math.random() - 0.5) * 2, envPhysics.windStrength * 1.5));
      setWindSpeed(windTarget);
      setWindDirection(prev => (prev + (Math.random() - 0.5) * 5 + 360) % 360);
      setTemperature(isIndoor ? 22 : 22 - altitude * 0.15 + terrainElevation * 0.01); // Indoor constant temp
      setPressure(1013.25 * Math.pow(1 - (altitude + terrainElevation) / 44330, 5.255)); // Barometric formula with terrain
      const humidityBase = isIndoor ? 55 : 65 - envPhysics.windStrength * 1.2;
      const humidityAdjustment = (Math.random() - 0.5) * 4 - altitude * 0.05;
      setHumidity(Math.max(20, Math.min(90, humidityBase + humidityAdjustment)));
      
      // IMU sensors
      setAcceleration({
        x: velocity.x * 0.5,
        y: velocity.y * 0.5,
        z: 9.81 + (flying ? verticalSpeed * 0.3 : 0)
      });
      
      setGyroscope({
        x: pitch * 0.0174533, // Convert to rad/s
        y: roll * 0.0174533,
        z: (yaw - heading) * 0.01
      });
      const headingRad = heading * (Math.PI / 180);
      setMagnetometer({
        x: Math.cos(headingRad) * 35 + (Math.random() - 0.5) * 2,
        y: Math.sin(headingRad) * 35 + (Math.random() - 0.5) * 2,
        z: 45 + (Math.random() - 0.5) * 4
      });
      
      // Flight controller stats
      setCpuLoad(15 + (flying ? 25 : 0) + (graspMode ? 10 : 0) + Math.random() * 5);
      setLoopTime(250 + Math.random() * 50);
      
      // Failsafe monitoring (priority order: battery > signal > altitude)
      if (battery <= 5) {
        setFailsafeStatus('EMERGENCY_LAND');
      } else if (battery <= 10) {
        setFailsafeStatus('CRITICAL_BATTERY');
      } else if (battery <= 20) {
        setFailsafeStatus('LOW_BATTERY');
      } else if (signalStrength < 40) {
        setFailsafeStatus('SIGNAL_LOST');
      } else if (signalStrength < 50) {
        setFailsafeStatus('WEAK_SIGNAL');
      } else if (altitude > parameters.maxAltitude) {
        setFailsafeStatus('MAX_ALT');
      } else {
        setFailsafeStatus('OK');
      }
      
    }, 100);

    return () => clearInterval(physicsLoop);
  }, [flying, isIndoor]);

  // Periodic state saving during flight (every 5 seconds)
  useEffect(() => {
    if (!flying) return;

    const saveInterval = setInterval(() => {
      const currentEnv = isIndoor ? 'indoor' : 'outdoor';
      saveEnvironmentState(currentEnv);
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [flying, isIndoor, dronePosition, altitude, velocity, pitch, roll, yaw, heading, battery, totalFlightTime, maxAltitudeReached, flightPath, parameters]);

  // Auto simulation sequence with realistic movement and morphing
  useEffect(() => {
    // Update refs whenever state changes
    autoSimulationRef.current = autoSimulation;
    shapeModeRef.current = shapeMode;
    
    if (!autoSimulation) return;

    const sequence = async () => {
      // Use environment-appropriate positions
      const envPhysics = getEnvironmentPhysics(isIndoor, indoorBounds);
      
      // Calculate dynamic positions based on room size
      let pickupPos, deliveryPos;
      if (isIndoor) {
        // Indoor: convert real-world shelf/target coordinates back into map percentages
        const shelfX = -indoorBounds.width / 3;  // 3D X position (negative = left side)
        const shelfZ = indoorBounds.depth / 4;    // 3D Z position (positive = front)
        pickupPos = sceneToMapCoords(
          { x: shelfX, z: shelfZ },
          { isIndoor: true, indoorBounds }
        );
        
        // Delivery target at [0, 0, -depth/3] in 3D space (Scene3D.jsx line 127)
        const targetZ = -indoorBounds.depth / 3;  // 3D Z position (negative = back)
        deliveryPos = sceneToMapCoords(
          { x: 0, z: targetZ },
          { isIndoor: true, indoorBounds }
        );
        
        // Log calculated positions for debugging
        addLog(`📍 Room: ${indoorBounds.name}`);
        addLog(`📦 Pickup: (${pickupPos.x}, ${pickupPos.y}) | Delivery: (${deliveryPos.x}, ${deliveryPos.y})`);
      } else {
        pickupPos = packagePosition;
        deliveryPos = targetPosition;
      }
      const homePos = { x: 10, y: 90 };
      
      // Indoor uses gentler throttle changes
      const climbThrottle = isIndoor ? 58 : 65;
      const cruiseThrottle = isIndoor ? 52 : 55;
      const descendThrottle = isIndoor ? 45 : 40;
      const landThrottle = isIndoor ? 42 : 35;
      
      switch(simulationStep) {
        case 0:
          addLog('🚁 Initializing flight systems...');
          setShapeMode('standard');
          setTimeout(() => setSimulationStep(1), 1500);
          break;
        case 1:
          addLog('⚡ Arming motors...');
          setArmed(true);
          setTimeout(() => setSimulationStep(2), 1500);
          break;
        case 2: {
          // Calculate safe cruise altitude based on environment
          // Use 50-60% of max altitude for safety, with room-specific limits
          const cruiseAlt = isIndoor ? Math.min(envPhysics.maxAltitude * 0.55, envPhysics.maxAltitude - 0.5) : 50;
          addLog(`🚀 Taking off to ${isIndoor ? 'safe' : 'cruise'} altitude (${cruiseAlt.toFixed(1)}m)...`);
          setFlying(true);
          setThrottle(climbThrottle);
          
          // Clear any existing altitude control
          if (altitudeIntervalRef.current) {
            clearInterval(altitudeIntervalRef.current);
            altitudeIntervalRef.current = null;
          }
          
          // ACTIVELY climb to target altitude using interval
          altitudeIntervalRef.current = setInterval(() => {
            setAltitude(prev => {
              const newAlt = prev + 0.08; // Climb at ~8cm per 100ms = 0.8m/s
              console.log(`Climb: ${prev.toFixed(2)}m -> ${newAlt.toFixed(2)}m (target: ${cruiseAlt.toFixed(2)}m)`);
              
              if (newAlt >= cruiseAlt) {
                if (altitudeIntervalRef.current) {
                  clearInterval(altitudeIntervalRef.current);
                  altitudeIntervalRef.current = null;
                }
                setThrottle(cruiseThrottle); // Switch to cruise throttle
                addLog(`✅ Reached cruise altitude: ${cruiseAlt.toFixed(1)}m`);
                return cruiseAlt;
              }
              return newAlt;
            });
          }, 100);
          
          // Dynamic timing: small rooms climb faster (less distance)
          const climbTime = isIndoor ? Math.max(2000, cruiseAlt * 1000) : 2500;
          setTimeout(() => {
            if (altitudeIntervalRef.current) {
              clearInterval(altitudeIntervalRef.current);
              altitudeIntervalRef.current = null;
            }
            setSimulationStep(3);
          }, climbTime);
          break;
        }
        case 3:
          addLog('🎯 Flying to package location...');
          setThrottle(cruiseThrottle);
          // Wait for movement to complete before proceeding
          moveToPosition(pickupPos, () => {
            addLog('✅ Reached package location');
            setSimulationStep(4);
          });
          break;
        case 4:
          addLog('📍 Hovering above package...');
          setThrottle(50); // Hover
          setVelocity({ x: 0, y: 0 }); // Stop horizontal movement
          setTimeout(() => setSimulationStep(5), 1000);
          break;
        case 5:
          addLog('🔄 Morphing to wide-grasp configuration for pickup...');
          handleShapeChange('wide-grasp'); // Better for grasping
          setTimeout(() => setSimulationStep(6), 2500);
          break;
        case 6: {
          // Descend to package height - shelf is at 0.62m for all indoor sizes, 0.15m outdoor
          const pickupHeight = isIndoor ? 0.75 : 0.25;  // Hover slightly above shelf
          addLog(`⬇️ Descending to pickup height (${pickupHeight}m)...`);
          setThrottle(descendThrottle);
          
          // Clear any existing altitude control
          if (altitudeIntervalRef.current) {
            clearInterval(altitudeIntervalRef.current);
            altitudeIntervalRef.current = null;
          }
          
          // ACTIVELY descend to target altitude
          altitudeIntervalRef.current = setInterval(() => {
            setAltitude(prev => {
              const diff = pickupHeight - prev;
              if (Math.abs(diff) < 0.05) {
                if (altitudeIntervalRef.current) {
                  clearInterval(altitudeIntervalRef.current);
                  altitudeIntervalRef.current = null;
                }
                setThrottle(50); // Stabilize
                return pickupHeight;
              }
              return prev + diff * 0.15; // Smooth descent
            });
          }, 100);
          
          // Use dynamic timing based on altitude difference
          const descentTime = Math.max(1500, Math.abs(altitude - pickupHeight) * 800);
          setTimeout(() => {
            if (altitudeIntervalRef.current) {
              clearInterval(altitudeIntervalRef.current);
              altitudeIntervalRef.current = null;
            }
            setSimulationStep(7);
          }, descentTime);
          break;
        }
        case 7:
          addLog('📦 Engaging grasp mode and securing package...');
          setThrottle(50); // Stabilize
          setVelocity({ x: 0, y: 0 }); // Ensure no drift
          
          // Wait for stabilization, then grasp
          setTimeout(() => {
            // Verify we're at the right position and altitude
            const distToPickup = calculateDistance(dronePosition, pickupPos);
            const atCorrectAlt = Math.abs(altitude - 0.75) < 0.3;
            
            if (distToPickup < 2 && atCorrectAlt) {
              setGraspMode(true);
              setPackageGrabbed(true);
              setDeliveryStatus('grasped');
              addLog('✅ Package secured successfully!');
            } else {
              addLog('⚠️ Repositioning for grasp...');
              // Retry positioning
              moveToPosition(pickupPos, () => {
                setGraspMode(true);
                setPackageGrabbed(true);
                setDeliveryStatus('grasped');
              });
            }
          }, 800);
          setTimeout(() => setSimulationStep(8), 3000); // Give time for grasp animation
          break;
        case 8: {
          addLog('⬆️ Ascending with package to cruise altitude...');
          setThrottle(climbThrottle);
          
          // Clear any existing altitude control
          if (altitudeIntervalRef.current) {
            clearInterval(altitudeIntervalRef.current);
            altitudeIntervalRef.current = null;
          }
          
          // ACTIVELY ascend back to cruise altitude
          const targetCruiseAlt = isIndoor ? Math.min(envPhysics.maxAltitude * 0.55, envPhysics.maxAltitude - 0.5) : 50;
          altitudeIntervalRef.current = setInterval(() => {
            setAltitude(prev => {
              const diff = targetCruiseAlt - prev;
              if (Math.abs(diff) < 0.05) {
                if (altitudeIntervalRef.current) {
                  clearInterval(altitudeIntervalRef.current);
                  altitudeIntervalRef.current = null;
                }
                setThrottle(cruiseThrottle);
                return targetCruiseAlt;
              }
              return prev + diff * 0.12; // Climb smoothly
            });
          }, 100);
          
          // Dynamic ascent timing based on altitude gain needed
          const ascentTime = isIndoor ? Math.max(2000, (targetCruiseAlt - altitude) * 1000) : 2500;
          setTimeout(() => {
            if (altitudeIntervalRef.current) {
              clearInterval(altitudeIntervalRef.current);
              altitudeIntervalRef.current = null;
            }
            setSimulationStep(9);
          }, ascentTime);
          break;
        }
        case 9:
          addLog('🔄 Morphing to compact configuration for efficient flight...');
          handleShapeChange('compact');
          setTimeout(() => setSimulationStep(10), 2500);
          break;
        case 10:
          addLog('✈️ Flying to delivery location...');
          setThrottle(cruiseThrottle);
          // Wait for movement to complete before proceeding
          moveToPosition(deliveryPos, () => {
            addLog('✅ Reached delivery location');
            setSimulationStep(11);
          });
          break;
        case 11:
          addLog('📍 Hovering above delivery point...');
          setThrottle(50); // Hover
          setVelocity({ x: 0, y: 0 }); // Stop horizontal movement
          setTimeout(() => setSimulationStep(12), 1000);
          break;
        case 12:
          addLog('🔄 Morphing to precision placement configuration...');
          handleShapeChange('precision'); // Precision mode for accurate delivery
          setTimeout(() => setSimulationStep(13), 2500);
          break;
        case 13: {
          // Descend to delivery height (ground level ~0.1m for all environments)
          const deliveryHeight = 0.15;
          addLog(`⬇️ Descending to delivery height (${deliveryHeight}m)...`);
          setThrottle(descendThrottle);
          
          // Clear any existing altitude control
          if (altitudeIntervalRef.current) {
            clearInterval(altitudeIntervalRef.current);
            altitudeIntervalRef.current = null;
          }
          
          // ACTIVELY descend to delivery altitude
          altitudeIntervalRef.current = setInterval(() => {
            setAltitude(prev => {
              const diff = deliveryHeight - prev;
              if (Math.abs(diff) < 0.05) {
                if (altitudeIntervalRef.current) {
                  clearInterval(altitudeIntervalRef.current);
                  altitudeIntervalRef.current = null;
                }
                setThrottle(50);
                return deliveryHeight;
              }
              return prev + diff * 0.15; // Descend smoothly
            });
          }, 100);
          
          // Dynamic timing based on current altitude
          const deliveryDescentTime = Math.max(1500, Math.abs(altitude - deliveryHeight) * 800);
          setTimeout(() => {
            if (altitudeIntervalRef.current) {
              clearInterval(altitudeIntervalRef.current);
              altitudeIntervalRef.current = null;
            }
            setSimulationStep(14);
          }, deliveryDescentTime);
          break;
        }
        case 14:
          addLog('📤 Releasing package at delivery point...');
          setThrottle(50); // Stabilize
          setVelocity({ x: 0, y: 0 }); // Ensure no drift
          
          // Wait for stabilization, then release
          setTimeout(() => {
            // Verify we're at the correct position and altitude
            const distToDelivery = calculateDistance(dronePosition, deliveryPos);
            const atGroundLevel = altitude < 0.3;
            
            if (distToDelivery < 2 && atGroundLevel) {
              setGraspMode(false);
              setPackageGrabbed(false);
              setDeliveryStatus('delivered');
              addLog('✅ Package delivered successfully!');
            } else {
              addLog('⚠️ Repositioning for delivery...');
              // Retry positioning
              moveToPosition(deliveryPos, () => {
                setGraspMode(false);
                setPackageGrabbed(false);
                setDeliveryStatus('delivered');
              });
            }
          }, 800);
          setTimeout(() => setSimulationStep(15), 2500); // Give time for release animation
          break;
        case 15: {
          addLog('⬆️ Ascending from delivery point...');
          setThrottle(climbThrottle);
          
          // Clear any existing altitude control
          if (altitudeIntervalRef.current) {
            clearInterval(altitudeIntervalRef.current);
            altitudeIntervalRef.current = null;
          }
          
          // ACTIVELY ascend back to safe altitude
          const returnAlt = isIndoor ? Math.min(envPhysics.maxAltitude * 0.55, envPhysics.maxAltitude - 0.5) : 50;
          altitudeIntervalRef.current = setInterval(() => {
            setAltitude(prev => {
              const diff = returnAlt - prev;
              if (Math.abs(diff) < 0.05) {
                if (altitudeIntervalRef.current) {
                  clearInterval(altitudeIntervalRef.current);
                  altitudeIntervalRef.current = null;
                }
                setThrottle(cruiseThrottle);
                return returnAlt;
              }
              return prev + diff * 0.12; // Climb smoothly
            });
          }, 100);
          
          // Climb back to safe altitude after delivery
          const returnAscentTime = isIndoor ? Math.max(1500, (returnAlt - altitude) * 1000) : 2000;
          setTimeout(() => {
            if (altitudeIntervalRef.current) {
              clearInterval(altitudeIntervalRef.current);
              altitudeIntervalRef.current = null;
            }
            setSimulationStep(16);
          }, returnAscentTime);
          break;
        }
        case 16:
          addLog('🔄 Morphing back to standard configuration...');
          handleShapeChange('standard');
          setTimeout(() => setSimulationStep(17), 2500);
          break;
        case 17:
          addLog('🏠 Returning to home base...');
          setThrottle(cruiseThrottle);
          // Wait for movement to complete before proceeding
          moveToPosition(homePos, () => {
            addLog('✅ Reached home base');
            setSimulationStep(18);
          });
          break;
        case 18:
          addLog('📍 Base location reached, preparing to land...');
          setThrottle(50); // Hover
          setVelocity({ x: 0, y: 0 }); // Stop all movement
          setTimeout(() => setSimulationStep(19), 1500);
          break;
        case 19:
          addLog('🛬 Initiating landing sequence...');
          setThrottle(landThrottle);
          setTimeout(() => setSimulationStep(20), isIndoor ? 2000 : 2500);
          break;
        case 20: {
          addLog('✅ Touchdown! Mission completed successfully!');
          setFlying(false);
          setThrottle(0);
          setArmed(false);
          setDeliveryStatus('ready');
          setVelocity({ x: 0, y: 0 });
          const missionTime = totalFlightTime.toFixed(1);
          const maxAlt = maxAltitudeReached.toFixed(1);
          const envType = isIndoor ? indoorBounds.name : 'Outdoor';
          addLog(`📊 Mission Stats - Time: ${missionTime}s | Max Alt: ${maxAlt}m | Environment: ${envType}`);
          setTimeout(() => {
            setAutoSimulation(false);
            setSimulationStep(0);
          }, 2000);
          break;
        }
      }
    };

    sequence();
  }, [autoSimulation, simulationStep]);

  // Movement animation - smooth velocity-based movement with collision detection
  const moveToPosition = (target, onComplete) => {
    // Clear any existing movement
    if (moveToPositionRef.current) {
      clearInterval(moveToPositionRef.current);
      moveToPositionRef.current = null;
    }
    
    const startPos = { ...dronePosition };
    const distance = calculateDistance(startPos, target);
    const multipliers = getShapeMultipliers();
    const envPhysics = getEnvironmentPhysics(isIndoor, indoorBounds);
    
    // Scale speed based on environment and room size
    // Smaller rooms = slower, more precise movements
    const roomSizeFactor = isIndoor ? (indoorBounds.width / 10) : 1; // Normalize to medium room
    const maxSpeed = (envPhysics.maxSpeed * multipliers.speed * roomSizeFactor) / 25;
    
    // Calculate direction
    const dx = target.x - startPos.x;
    const dy = target.y - startPos.y;
    const angle = Math.atan2(dy, dx);
    
    let currentStep = 0;
    const updateInterval = 50; // 20 FPS for smooth movement
    // Scale steps: more steps for precise indoor movement
    const totalSteps = isIndoor ? Math.max(40, Math.floor(distance * 3)) : Math.max(30, Math.floor(distance * 2));
    
    const moveInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;
      
      // Smooth S-curve for acceleration/deceleration
      let speedFactor;
      if (progress < 0.3) {
        // Accelerate (ease in)
        speedFactor = Math.pow(progress / 0.3, 2);
      } else if (progress > 0.7) {
        // Decelerate (ease out)
        speedFactor = Math.pow((1 - progress) / 0.3, 2);
      } else {
        // Cruise at max speed
        speedFactor = 1;
      }
      
      // Calculate velocity
      const speed = maxSpeed * speedFactor;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      setVelocity({ x: vx * 0.3, y: vy * 0.3 }); // Scale for visual effect
      
      setDronePosition(() => {
        let newX = startPos.x + dx * progress;
        let newY = startPos.y + dy * progress;
        
        // Clamp to map bounds (5-95) for safety
        newX = Math.max(5, Math.min(95, newX));
        newY = Math.max(5, Math.min(95, newY));
        
        // Indoor collision detection and course correction
        if (isIndoor) {
          const { x: worldX, z: worldZ } = mapToSceneCoords(
            { x: newX, y: newY },
            { isIndoor: true, indoorBounds }
          );
          const pos3D = {
            x: worldX,
            y: altitude,
            z: worldZ
          };
          
          const boundsCheck = checkIndoorBounds(pos3D, indoorBounds, 0.3);
          
          if (!boundsCheck.withinBounds) {
            // Course correction: constrain to bounds
            const constrained = constrainToIndoorBounds(pos3D, indoorBounds, 0.3);
            const corrected = sceneToMapCoords(
              { x: constrained.x, z: constrained.z },
              { isIndoor: true, indoorBounds }
            );
            newX = corrected.x;
            newY = corrected.y;
            
            // Log collision warning (throttled)
            const now = Date.now();
            if (!window.lastMoveCollisionLog || now - window.lastMoveCollisionLog > 2000) {
              addLog('⚠️ Course corrected to avoid collision');
              window.lastMoveCollisionLog = now;
            }
          }
        }
        
        // Check if reached target - tighter tolerance for indoor, looser for outdoor
        const targetTolerance = isIndoor ? 0.5 : 1.0;
        const distRemaining = calculateDistance({ x: newX, y: newY }, target);
        
        if (distRemaining < targetTolerance || currentStep >= totalSteps) {
          clearInterval(moveInterval);
          moveToPositionRef.current = null;
          setVelocity({ x: 0, y: 0 });
          
          // Snap to exact target position for precision
          if (onComplete) {
            setTimeout(onComplete, 150); // Small delay to ensure state updates
          }
          return target;
        }
        
        return { x: newX, y: newY };
      });
    }, updateInterval);
    
    moveToPositionRef.current = moveInterval;
  };

  const handleWaypointSelect = (waypoint) => {
    if (!waypoint) return;
    if (!flying) {
      addLog('⚠️ Arm and take off before routing to a waypoint.');
      return;
    }
    if (autoSimulation) {
      addLog('⚠️ Pause auto simulation to manually route to waypoints.');
      return;
    }

    moveToPosition({ x: waypoint.x, y: waypoint.y }, () => {
      addLog(`🧭 Arrived at ${waypoint.label || 'waypoint'}`);
    });
    addLog(`🧭 Navigating to ${waypoint.label || 'waypoint'}`);
  };

  // Enhanced collision detection with proximity warnings
  const checkCollision = (newPosition, newAltitude) => {
    const collisions = {
      detected: false,
      warnings: [],
      corrections: { position: null, altitude: null }
    };

    if (isIndoor) {
      // Convert to 3D coordinates for indoor collision checking
      const { x: worldX, z: worldZ } = mapToSceneCoords(newPosition, {
        isIndoor: true,
        indoorBounds
      });
      const pos3D = { x: worldX, y: newAltitude, z: worldZ };

      const boundsCheck = checkIndoorBounds(pos3D, indoorBounds, 0.3);
      
      if (!boundsCheck.withinBounds) {
        collisions.detected = true;
        const constrained = constrainToIndoorBounds(pos3D, indoorBounds, 0.3);
        
        // Convert back to map coordinates
        collisions.corrections.position = sceneToMapCoords(
          { x: constrained.x, z: constrained.z },
          { isIndoor: true, indoorBounds }
        );
        collisions.corrections.altitude = constrained.y;
        
        if (boundsCheck.violations.x) collisions.warnings.push('Wall collision (X-axis)');
        if (boundsCheck.violations.z) collisions.warnings.push('Wall collision (Z-axis)');
        if (boundsCheck.violations.y) {
          if (pos3D.y >= indoorBounds.height) {
            collisions.warnings.push('Ceiling collision');
          } else {
            collisions.warnings.push('Floor collision');
          }
        }
      }

      // Proximity warnings (within 0.5m of boundaries)
      if (!collisions.detected) {
        if (boundsCheck.distances.toWallX < 0.5) {
          collisions.warnings.push(`⚠️ Near wall: ${(boundsCheck.distances.toWallX * 100).toFixed(0)}cm`);
        }
        if (boundsCheck.distances.toWallZ < 0.5) {
          collisions.warnings.push(`⚠️ Near wall: ${(boundsCheck.distances.toWallZ * 100).toFixed(0)}cm`);
        }
        if (boundsCheck.distances.toCeiling < 0.5) {
          collisions.warnings.push(`⚠️ Near ceiling: ${(boundsCheck.distances.toCeiling * 100).toFixed(0)}cm`);
        }
        if (boundsCheck.distances.toFloor < 0.3) {
          collisions.warnings.push(`⚠️ Low altitude: ${(boundsCheck.distances.toFloor * 100).toFixed(0)}cm`);
        }
      }
    } else {
      // Outdoor boundary checks (soft limits)
      const maxDistance = 45; // meters from center
      const { x: worldX, z: worldZ } = mapToSceneCoords(newPosition, { isIndoor: false });
      const distFromCenter = Math.hypot(worldX, worldZ);
      
      if (distFromCenter > maxDistance) {
        collisions.detected = true;
        collisions.warnings.push('Maximum range exceeded');
        
        // Calculate corrected position (constrain to max distance)
        const angle = Math.atan2(worldZ, worldX);
        collisions.corrections.position = sceneToMapCoords(
          {
            x: Math.cos(angle) * maxDistance,
            z: Math.sin(angle) * maxDistance
          },
          { isIndoor: false }
        );
      }

      // Proximity to obstacles (simplified - buildings at known positions)
      const buildings = [
        { x: -8, z: -10, radius: 4 },
        { x: 10, z: -8, radius: 5 },
        { x: -12, z: 8, radius: 3 }
      ];

      buildings.forEach((building, i) => {
        const dist = Math.hypot(worldX - building.x, worldZ - building.z);
        const threshold = building.radius + 2; // Include safety margin
        
        if (dist < threshold && newAltitude < 6) {
          collisions.warnings.push(`⚠️ Near building ${i + 1}`);
        }
      });
    }

    return collisions;
  };

  // Manual controls with enhanced collision detection
  const moveManually = (direction) => {
    if (!flying || autoSimulation) return;
    
    const multipliers = getShapeMultipliers();
    const moveSpeed = 3 * multipliers.speed;
    
    setDronePosition(prev => {
      let newPos = { ...prev };
      switch(direction) {
        case 'up': newPos.y = Math.max(prev.y - moveSpeed, 5); break;
        case 'down': newPos.y = Math.min(prev.y + moveSpeed, 95); break;
        case 'left': newPos.x = Math.max(prev.x - moveSpeed, 5); break;
        case 'right': newPos.x = Math.min(prev.x + moveSpeed, 95); break;
      }
      
      // Check for collisions
      const collision = checkCollision(newPos, altitude);
      if (collision.detected) {
        collision.warnings.forEach(warning => addLog(`🚫 ${warning}`));
        return collision.corrections.position || prev;
      }
      
      // Log proximity warnings
      if (collision.warnings.length > 0) {
        collision.warnings.forEach(warning => addLog(warning));
      }
      
      return newPos;
    });
    
    // Set velocity for speed calculation
    const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = directions[direction];
    setVelocity({ x: dx * moveSpeed, y: dy * moveSpeed });
    
    // Clear velocity after movement
    setTimeout(() => setVelocity({ x: 0, y: 0 }), 200);
  };

  // New: Manual altitude controls
  const changeAltitude = (direction) => {
    if (!flying || autoSimulation) return;
    
    const envPhysics = getEnvironmentPhysics(isIndoor, indoorBounds);
    const altitudeChange = direction === 'up' ? 1 : -1;
    
    setAltitude(prev => {
      const newAlt = Math.max(0.2, Math.min(prev + altitudeChange, envPhysics.maxAltitude));
      
      // Check collision at new altitude
      const collision = checkCollision(dronePosition, newAlt);
      if (collision.detected) {
        collision.warnings.forEach(warning => addLog(`🚫 ${warning}`));
        return collision.corrections.altitude || prev;
      }
      
      // Log altitude change
      addLog(`📏 Altitude: ${newAlt.toFixed(1)}m ${direction === 'up' ? '↑' : '↓'}`);
      
      // Update max altitude reached
      setMaxAltitudeReached(max => Math.max(max, newAlt));
      
      return newAlt;
    });
    
    // Adjust throttle accordingly
    setThrottle(prev => {
      const adjustment = direction === 'up' ? 5 : -5;
      return Math.max(0, Math.min(100, prev + adjustment));
    });
  };

  // Morph animation
  useEffect(() => {
    if (morphProgress > 0 && morphProgress < 100) {
      const timer = setTimeout(() => setMorphProgress(prev => Math.min(prev + 4, 100)), 40);
      return () => clearTimeout(timer);
    }
  }, [morphProgress]);

  const handleShapeChange = (mode) => {
    if (shapeMode === mode) return;
    addLog(`🔄 Morphing to ${mode.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} mode...`);
    setShapeMode(mode);
    setMorphProgress(1);
  };

  useEffect(() => {
    handleShapeChangeRef.current = handleShapeChange;
  }, [handleShapeChange]);

  const toggleGrasp = () => {
    if (!flying) {
      addLog('⚠️ Must be flying to grasp objects');
      return;
    }
    
    const distToPackage = calculateDistance(dronePosition, packagePosition);
    
    if (!graspMode && distToPackage > 10) {
      addLog('⚠️ Too far from package! Distance: ' + distToPackage.toFixed(1) + ' units');
      return;
    }
    
    if (!graspMode && packageGrabbed) {
      addLog('⚠️ Package already grabbed!');
      return;
    }
    
    const newGraspState = !graspMode;
    setGraspMode(newGraspState);
    
    if (newGraspState && distToPackage <= 10) {
      setPackageGrabbed(true);
      setDeliveryStatus('grasped');
      addLog('📦 Package grasped successfully');
    } else if (!newGraspState) {
  setPackageGrabbed(false);
  setDeliveryStatus('released');
  addLog('📦 Package released');
    }
  };

  const startSimulation = () => {
    if (autoSimulation) return;
    addLog('🎬 Starting automated delivery mission...');
    addLog('📊 Initializing flight telemetry systems...');
    setAutoSimulation(true);
    setSimulationStep(0);
    setDeliveryStatus('ready');
    setPackageGrabbed(false);
    setDronePosition({ x: 10, y: 90 });
    setBattery(100);
    setFlightMode('AUTO');
    setTotalFlightTime(0);
    setMaxAltitudeReached(0);
  };

  const stopSimulation = () => {
    addLog('⏸️ Simulation stopped');
    addLog(`📊 Total flight time: ${totalFlightTime.toFixed(1)}s | Max altitude: ${maxAltitudeReached.toFixed(1)}m`);
    
    // Clean up any active intervals
    if (altitudeIntervalRef.current) {
      clearInterval(altitudeIntervalRef.current);
      altitudeIntervalRef.current = null;
    }
    if (moveToPositionRef.current) {
      clearInterval(moveToPositionRef.current);
      moveToPositionRef.current = null;
    }
    
    setAutoSimulation(false);
    setSimulationStep(0);
    setFlying(false);
    setArmed(false);
    setGraspMode(false);
    setPackageGrabbed(false);
    setVelocity({ x: 0, y: 0 });
    setFlightMode('MANUAL');
  };

  // Export telemetry data (for real-world testing)
  const exportTelemetry = () => {
    const telemetryData = {
      timestamp: new Date().toISOString(),
      position: { ...dronePosition, altitude },
      gps: { ...gpsCoordinates, accuracy: gpsAccuracy, satellites: gpsSatellites },
      orientation: { pitch, roll, yaw, heading },
      velocity: { ground: groundSpeed, vertical: verticalSpeed },
      power: { voltage, current, watts: powerConsumption, battery, cells: batteryCell },
      motors: { rpm: motorRPM, temperatures: motorTemp },
      environment: { wind: { speed: windSpeed, direction: windDirection }, temperature, pressure, humidity },
      sensors: { acceleration, gyroscope, magnetometer },
      flightController: { cpuLoad, loopTime, mode: flightMode, failsafe: failsafeStatus },
      stats: { flightTime: totalFlightTime, maxAltitude: maxAltitudeReached, throttle },
      shapeMode,
      graspMode,
      packageGrabbed
    };
    
    const dataStr = JSON.stringify(telemetryData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drone-telemetry-${Date.now()}.json`;
    link.click();
    addLog('📥 Telemetry data exported');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 font-sans p-2 sm:p-4">
      {/* Header */}
      <div className="w-full mb-2 sm:mb-4">
        <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-2xl shadow-purple-500/20">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Radio className="text-white" size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate">ShapeShifter Drone</h1>
                <p className="text-purple-300 text-xs sm:text-sm hidden sm:block">Professional Flight Control System v3.0</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-4 items-center flex-wrap">
              <button
                onClick={autoSimulation ? stopSimulation : startSimulation}
                className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold flex items-center gap-1 sm:gap-2 transition-all duration-300 ${
                  autoSimulation
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/50'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50'
                }`}
              >
                {autoSimulation ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                <span className="hidden sm:inline">{autoSimulation ? 'STOP SIMULATION' : 'START AUTO'}</span>
                <span className="sm:hidden">{autoSimulation ? 'STOP' : 'START'}</span>
              </button>
              <button
                onClick={exportTelemetry}
                disabled={!flying && totalFlightTime === 0}
                className={`px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm font-semibold flex items-center gap-1 sm:gap-2 transition-all duration-300 ${
                  flying || totalFlightTime > 0
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30'
                    : 'bg-gray-500/20 text-gray-500 border border-gray-500/30 cursor-not-allowed'
                }`}
              >
                📥 <span className="hidden sm:inline">Export Data</span>
              </button>
              <button
                onClick={() => setShowMap(!showMap)}
                className="px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl text-sm font-semibold flex items-center gap-1 sm:gap-2 transition-all duration-300 bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30"
              >
                {showMap ? <Camera size={14} /> : <MapIcon size={14} />}
                <span className="hidden sm:inline">{showMap ? 'Grid View' : 'Map View'}</span>
              </button>
              <select
                value={baseLocation ? (Object.keys(PRESET_LOCATIONS).find(key => PRESET_LOCATIONS[key].lat === baseLocation.lat) || 'custom') : 'custom'}
                onChange={(e) => {
                  const location = PRESET_LOCATIONS[e.target.value];
                  if (location) {
                    setBaseLocation(location);
                    addLog(`📍 Location changed to ${location.name}`);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-black/40 text-purple-300 border border-purple-500/50 text-sm font-semibold cursor-pointer hover:bg-black/60 transition-all"
              >
                {Object.entries(PRESET_LOCATIONS).map(([key, loc]) => (
                  <option key={key} value={key}>{loc.name}</option>
                ))}
              </select>
              {/* Environment / View controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleEnvironmentToggle}
                  title={isIndoor ? 'Switch to Outdoor (States isolated)' : 'Switch to Indoor (States isolated)'}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 transition-all relative ${isIndoor ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                >
                  {isIndoor ? <Building2 size={16} /> : <Globe size={16} />}
                  <span>{isIndoor ? 'Indoor' : 'Outdoor'}</span>
                  {/* Environment isolation indicator */}
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Independent state" />
                </button>

                <button
                  onClick={handleView3DToggle}
                  title={view3D ? 'Switch to 2D view' : 'Switch to 3D view'}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 transition-all ${view3D ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-black/40 text-purple-300 border border-purple-500/50 hover:bg-black/60'}`}
                >
                  <Camera size={16} />
                  <span>{view3D ? '3D' : '2D'}</span>
                </button>

                <button
                  onClick={handleGetCurrentLocation}
                  title={useCurrentLocation ? "Using your location" : "Get current location"}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 transition-all ${
                    useCurrentLocation 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-black/40 text-purple-300 border border-purple-500/50 hover:bg-black/60'
                  }`}
                >
                  <Crosshair size={16} />
                  <span>{useCurrentLocation ? '📍 Your Location' : 'Get GPS'}</span>
                </button>

                {isIndoor && (
                  <select
                    value={Object.keys(INDOOR_BOUNDS).find(k => INDOOR_BOUNDS[k] === indoorBounds) || 'medium'}
                    onChange={(e) => handleIndoorBoundsChange(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black/40 text-purple-300 border border-purple-500/50 text-sm font-semibold cursor-pointer hover:bg-black/60 transition-all capitalize"
                  >
                    {Object.keys(INDOOR_BOUNDS).map(key => (
                      <option key={key} value={key} className="capitalize">{key} Room</option>
                    ))}
                  </select>
                )}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                signalStrength > 80 ? 'bg-green-500/20 border-green-500/50' : 
                signalStrength > 50 ? 'bg-yellow-500/20 border-yellow-500/50' : 
                'bg-red-500/20 border-red-500/50'
              }`}>
                <Wifi size={16} className={
                  signalStrength > 80 ? 'text-green-400' : 
                  signalStrength > 50 ? 'text-yellow-400' : 
                  'text-red-400'
                } />
                <span className={`text-sm font-semibold ${
                  signalStrength > 80 ? 'text-green-400' : 
                  signalStrength > 50 ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>{signalStrength.toFixed(0)}%</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                battery > 50 ? 'bg-blue-500/20 border-blue-500/50' : 
                battery > 20 ? 'bg-yellow-500/20 border-yellow-500/50' : 
                'bg-red-500/20 border-red-500/50 animate-pulse'
              }`}>
                <Battery size={16} className={`${
                  battery > 50 ? 'text-blue-400' : 
                  battery > 20 ? 'text-yellow-400' : 
                  'text-red-400'
                } ${battery <= 10 ? 'animate-bounce' : ''}`} />
                <span className={`text-sm font-semibold ${
                  battery > 50 ? 'text-blue-400' : 
                  battery > 20 ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>
                  {battery.toFixed(0)}%
                  {battery <= 20 && battery > 10 && ' ⚠️'}
                  {battery <= 10 && ' 🚨'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/50">
                <span className="text-purple-400 text-sm font-semibold">{flightMode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* New Layout: Simulation with 3D Mini View */}
        <div className="w-full">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 sm:gap-4">
          {/* Primary View - 2/3 width */}
          <div className="xl:col-span-2 bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0">
              <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                {showMap ? (
                  <>
                    <Globe className="text-blue-400" size={18} />
                    <span className="hidden sm:inline">Satellite Map View</span>
                    <span className="sm:hidden">Map</span>
                  </>
                ) : view3D ? (
                  <>
                    <Camera className="text-purple-400" size={18} />
                    <span className="hidden sm:inline">3D Simulation View</span>
                    <span className="sm:hidden">3D</span>
                  </>
                ) : (
                  <>
                    <Camera className="text-blue-400" size={18} />
                    <span className="hidden sm:inline">Grid Simulation View</span>
                    <span className="sm:hidden">Grid</span>
                  </>
                )}
              </h2>
              {showMap && (
                <div className="flex gap-1 sm:gap-2">
                  {['satellite', 'street', 'terrain'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setMapType(type)}
                      className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        mapType === type
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/10 text-purple-300 hover:bg-white/20'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="w-full h-96 sm:h-[500px] lg:h-[600px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl flex items-center justify-center relative overflow-hidden border-2 border-purple-500/30">
              {showMap ? (
                baseLocation ? (
                  <MapView
                    dronePosition={droneGPS}
                    basePosition={baseGPS}
                    packagePosition={packageGPS}
                    targetPosition={targetGPS}
                    flightPath={flightPath}
                    flying={flying}
                    altitude={altitude}
                    mapType={mapType}
                    centerOn={mapCenterOn}
                  />
                ) : (
                  <div className="text-purple-300 text-center p-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                    <div className="text-sm">Loading map location...</div>
                  </div>
                )
              ) : (
                view3D ? (
                  <div className="w-full h-full">
                    <Scene3D
                      dronePosition={{ x: dronePosition.x, y: dronePosition.y }}
                      altitude={altitude}
                      pitch={pitch}
                      roll={roll}
                      yaw={yaw}
                      flying={flying}
                      armed={armed}
                      throttle={throttle}
                      shapeMode={shapeMode}
                      graspMode={graspMode}
                      isIndoor={isIndoor}
                      indoorBounds={indoorBounds}
                      packageGrabbed={packageGrabbed}
                    />
                  </div>
                ) : ( <>
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-20">
                {[...Array(10)].map((_, i) => (
                  <div key={`h${i}`} className="absolute w-full border-t border-purple-500" style={{ top: `${i * 10}%` }} />
                ))}
                {[...Array(10)].map((_, i) => (
                  <div key={`v${i}`} className="absolute h-full border-l border-purple-500" style={{ left: `${i * 10}%` }} />
                ))}
              </div>

              {/* Base station */}
              <div 
                className="absolute w-10 h-10 bg-purple-500/30 border-2 border-purple-400 rounded-lg flex items-center justify-center"
                style={{ 
                  left: '10%', 
                  top: '90%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              </div>

              {/* Package pickup location */}
              <div 
                className="absolute w-8 h-8 bg-blue-500/50 border-2 border-blue-400 rounded flex items-center justify-center transition-all duration-500"
                style={{ 
                  left: `${packagePosition.x}%`, 
                  top: `${packagePosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: packageGrabbed ? 0.3 : 1
                }}
              >
                <Package size={16} className="text-blue-300" />
              </div>

              {/* Delivery target location */}
              <div 
                className="absolute w-12 h-12 border-2 border-dashed border-green-400 rounded-full flex items-center justify-center"
                style={{ 
                  left: `${targetPosition.x}%`, 
                  top: `${targetPosition.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse" />
              </div>

              {/* Drone visualization */}
              <div 
                className="absolute transition-all duration-200 ease-out"
                style={{ 
                  left: `${dronePosition.x}%`, 
                  top: `${dronePosition.y}%`,
                  transform: `translate(-50%, -50%) ${altitude > 0 ? `scale(${1 + altitude * 0.002})` : 'scale(1)'}`
                }}
              >
                {/* Central body */}
                <div className={`w-16 h-16 border-4 rounded-full flex items-center justify-center transition-all duration-500 ${
                  armed ? 'border-green-400 shadow-lg shadow-green-400/50' : 'border-purple-400'
                }`}>
                  <Radio size={24} className={flying ? 'text-green-400' : 'text-purple-400'} />
                </div>
                
                {/* Morphing arms with rotors - showing current shape mode */}
                {(() => {
                  // Define arm positions based on shape mode
                  const armConfigs = {
                    standard: [
                      { angle: 45, distance: 30 },   // Front-right
                      { angle: 135, distance: 30 },  // Back-right
                      { angle: 225, distance: 30 },  // Back-left
                      { angle: 315, distance: 30 }   // Front-left
                    ],
                    compact: [
                      { angle: 45, distance: 22 },   // Closer X pattern
                      { angle: 135, distance: 22 },
                      { angle: 225, distance: 22 },
                      { angle: 315, distance: 22 }
                    ],
                    'wide-grasp': [
                      { angle: 0, distance: 35 },    // Wider spread
                      { angle: 90, distance: 35 },
                      { angle: 180, distance: 35 },
                      { angle: 270, distance: 35 }
                    ]
                  };
                  
                  const currentConfig = armConfigs[shapeMode] || armConfigs.standard;
                  
                  return currentConfig.map((config, idx) => (
                    <div key={idx}>
                      {/* Morphing arm */}
                      <div
                        className={`absolute w-1 transition-all duration-500 ${
                          graspMode ? 'bg-orange-400' : 'bg-purple-400/60'
                        }`}
                        style={{
                          top: '50%',
                          left: '50%',
                          height: `${config.distance - 6}px`,
                          transformOrigin: 'top center',
                          transform: `translate(-50%, -50%) rotate(${config.angle}deg) translateY(-${config.distance/2}px)`
                        }}
                      />
                      {/* Rotor with realistic rotation */}
                      <div
                        className={`absolute w-6 h-6 rounded-full transition-all duration-500 ${
                          flying ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-purple-400'
                        }`}
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `translate(-50%, -50%) rotate(${config.angle}deg) translateY(-${config.distance}px) rotate(${flying ? rotorRotation + idx * 90 : 0}deg)`,
                          transition: flying ? 'transform 0.05s linear' : 'all 0.5s'
                        }}
                      />
                    </div>
                  ));
                })()}

                {/* Altitude shadow indicator */}
                {altitude > 0 && (
                  <div 
                    className="absolute w-16 h-16 bg-black rounded-full blur-xl transition-all duration-200"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%)`,
                      opacity: Math.min(0.3, altitude / 100),
                      scale: 1 + altitude * 0.01
                    }}
                  />
                )}

                {/* Package attached indicator */}
                {packageGrabbed && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                    <Package size={20} className="text-yellow-400 animate-bounce" />
                  </div>
                )}
              </div>

              {/* Status overlay */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <div className="bg-black/60 px-3 py-1 rounded-full text-green-400 text-sm font-semibold">
                  {flying ? '● FLYING' : '○ STANDBY'}
                </div>
                <div className="flex gap-2">
                  <div className={`bg-black/60 px-3 py-1 rounded-full text-sm font-semibold ${
                    shapeMode === 'standard' ? 'text-blue-400' : 
                    shapeMode === 'compact' ? 'text-purple-400' : 'text-yellow-400'
                  }`}>
                    {shapeMode.toUpperCase()}
                  </div>
                  {graspMode && (
                    <div className="bg-black/60 px-3 py-1 rounded-full text-orange-400 text-sm font-semibold animate-pulse">
                      🤏 GRASPING
                    </div>
                  )}
                </div>
              </div>

              {/* Legend & Info */}
              <div className="absolute bottom-4 left-4 bg-black/60 p-3 rounded-lg text-xs space-y-2">
                <div className="flex items-center gap-2 text-blue-300">
                  <Package size={12} /> Pickup Point
                </div>
                <div className="flex items-center gap-2 text-green-300">
                  <div className="w-3 h-3 bg-green-400 rounded-full" /> Delivery Target
                </div>
                <div className="border-t border-white/20 pt-2 text-purple-300">
                  Alt: {altitude.toFixed(1)}m
                </div>
                {packageGrabbed && (
                  <div className="text-yellow-400 font-semibold">
                    📦 Package Secured
                  </div>
                )}
              </div>
              </>
                )
              )}
            </div>

            {/* Primary Telemetry - Horizontal Below Simulation */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-2 sm:mt-4 flex-shrink-0">
              <div className="bg-white/5 p-2 sm:p-3 rounded-lg border border-purple-500/20">
                <div className="text-xs text-purple-300">Altitude</div>
                <div className="text-lg sm:text-xl font-bold text-white">{altitude.toFixed(1)}m</div>
                <div className="text-xs text-purple-400">↑ {verticalSpeed.toFixed(1)} m/s</div>
              </div>
              <div className="bg-white/5 p-2 sm:p-3 rounded-lg border border-purple-500/20">
                <div className="text-xs text-purple-300">Speed</div>
                <div className="text-lg sm:text-xl font-bold text-white">{groundSpeed.toFixed(1)}m/s</div>
                <div className="text-xs text-purple-400">{(groundSpeed * 3.6).toFixed(1)} km/h</div>
              </div>
              <div className="bg-white/5 p-2 sm:p-3 rounded-lg border border-purple-500/20">
                <div className="text-xs text-purple-300">Distance</div>
                <div className="text-lg sm:text-xl font-bold text-white">
                  {baseDistanceLabel}
                </div>
                <div className="text-xs text-purple-400">from base</div>
              </div>
              <div className="bg-white/5 p-2 sm:p-3 rounded-lg border border-purple-500/20">
                <div className="text-xs text-purple-300">Throttle</div>
                <div className="text-lg sm:text-xl font-bold text-white">{throttle.toFixed(0)}%</div>
                <div className="text-xs text-purple-400">power</div>
              </div>
              <div className="bg-white/5 p-2 sm:p-3 rounded-lg border border-purple-500/20">
                <div className="text-xs text-purple-300">Flight Time</div>
                <div className="text-lg sm:text-xl font-bold text-white">{totalFlightTime.toFixed(0)}s</div>
                <div className="text-xs text-purple-400">elapsed</div>
              </div>
              <div className="bg-white/5 p-2 sm:p-3 rounded-lg border border-purple-500/20">
                <div className="text-xs text-purple-300">Max Alt</div>
                <div className="text-lg sm:text-xl font-bold text-white">{maxAltitudeReached.toFixed(1)}m</div>
                <div className="text-xs text-purple-400">record</div>
              </div>
            </div>
          </div>

          {/* 3D Mini View & Controls - 1/3 width */}
          <div className="xl:col-span-1 flex flex-col gap-2 sm:gap-4">
            <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xl flex-shrink-0">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Camera className="text-purple-400" size={20} />
                3D Drone View
              </h3>
              <div className="aspect-square">
                <Drone3DMiniView
                  dronePosition={dronePosition}
                  droneRotation={[pitch * Math.PI / 180, roll * Math.PI / 180, yaw * Math.PI / 180]}
                  flying={flying}
                  armed={armed}
                  throttle={throttle}
                  shapeMode={shapeMode}
                  graspMode={graspMode}
                  altitude={altitude}
                />
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Pitch:</span>
                  <span className="text-white font-semibold">{pitch.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Roll:</span>
                  <span className="text-white font-semibold">{roll.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Yaw:</span>
                  <span className="text-white font-semibold">{yaw.toFixed(1)}°</span>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Control Panels Below - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4 flex-shrink-0">
            {/* Parameters Panel Column */}
            <div className="lg:col-span-1">
              <ParametersPanel
                parameters={parameters}
                onParameterChange={handleParameterChange}
                presets={dronePresets}
                onPresetSelect={handlePresetSelect}
              />
            </div>

            {/* Shape & Grasp Column */}
            <div className="space-y-2 sm:space-y-4">
              <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-2xl">
                <h2 className="text-base sm:text-xl font-bold text-white mb-2 sm:mb-4 flex items-center gap-2">
                  <Zap className="text-yellow-400" size={18} />
                  Morphing Control
                </h2>
                
                <div className="space-y-2 sm:space-y-3">
                  {['standard', 'wide-grasp', 'precision', 'compact'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleShapeChange(mode)}
                      className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 ${
                        shapeMode === mode
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50 scale-105'
                          : 'bg-white/10 text-purple-200 hover:bg-white/20'
                      }`}
                    >
                      {mode.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Mode
                    </button>
                  ))}
                </div>

                {morphProgress > 0 && morphProgress < 100 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-purple-300 mb-2">
                      <span>Morphing...</span>
                      <span>{morphProgress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100 rounded-full"
                        style={{ width: `${morphProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Grasp Control */}
              <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-2xl">
                <h2 className="text-base sm:text-xl font-bold text-white mb-2 sm:mb-4 flex items-center gap-2">
                  <Package className="text-green-400" size={18} />
                  Grasp System
                </h2>
                
                <button
                  onClick={toggleGrasp}
                  className={`w-full py-3 sm:py-4 px-3 sm:px-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg transition-all duration-300 ${
                    graspMode
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50'
                      : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/50'
                  }`}
                >
                  {graspMode ? '✓ Object Grasped' : '○ Ready to Grasp'}
                </button>

                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-white/5 rounded-lg border border-purple-500/20">
                  <div className="text-xs sm:text-sm text-purple-300">Delivery Status:</div>
                  <div className="text-base sm:text-lg font-bold text-white capitalize">{deliveryStatus}</div>
                </div>
              </div>

              <WaypointsPanel
                waypoints={quickWaypoints}
                activeId="drone"
                onSelect={handleWaypointSelect}
              />

              {/* Mission Log */}
              <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-2xl">
                <h2 className="text-base sm:text-xl font-bold text-white mb-2 sm:mb-4">Mission Log</h2>
                <div className="space-y-1 sm:space-y-2 h-32 sm:h-40 overflow-y-auto">
                  {missionLog.length === 0 ? (
                    <div className="text-purple-300 text-sm italic">No activity yet...</div>
                  ) : (
                    missionLog.map((log, idx) => (
                      <div key={idx} className="text-green-400 text-xs font-mono bg-black/30 p-2 rounded">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          {/* Center Column - Advanced Telemetry Panel */}
          <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-2xl">
            <div className="bg-black/40 backdrop-blur-xl border border-blue-500/30 rounded-lg sm:rounded-xl p-2 sm:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className="text-xs sm:text-sm font-bold text-blue-300">Flight Telemetry</h3>
                <div className={`text-xs px-2 py-1 rounded ${
                  failsafeStatus === 'OK' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {failsafeStatus}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                {/* Orientation */}
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-purple-300 mb-1">Orientation</div>
                  <div className="text-white">Pitch: {pitch.toFixed(1)}°</div>
                  <div className="text-white">Roll: {roll.toFixed(1)}°</div>
                  <div className="text-white">Yaw: {yaw.toFixed(1)}°</div>
                </div>

                {/* GPS */}
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-purple-300 mb-1">GPS ({gpsSatellites} sats)</div>
                  <div className="text-white">{gpsCoordinates.lat.toFixed(6)}°N</div>
                  <div className="text-white">{Math.abs(gpsCoordinates.lon).toFixed(6)}°W</div>
                  <div className="text-green-400">±{gpsAccuracy.toFixed(1)}m</div>
                </div>

                {/* Power */}
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-purple-300 mb-1">Power & Battery</div>
                  <div className="text-white">Voltage: {voltage.toFixed(2)}V</div>
                  <div className="text-white">Current: {current.toFixed(2)}A</div>
                  <div className="text-yellow-400">{powerConsumption.toFixed(0)}W</div>
                  <div className={`text-sm mt-1 ${battery > 20 ? 'text-green-400' : 'text-red-400'}`}>
                    Battery: {battery.toFixed(1)}%
                    {flying && (
                      <span className="text-xs ml-1">
                        ({(battery / (current / 5)).toFixed(0)}min)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-1">
                    {batteryCell.map((cell, i) => (
                      <div key={i} className={`text-xs ${cell > 3.7 ? 'text-green-300' : cell > 3.5 ? 'text-yellow-300' : 'text-red-300'}`}>
                        {cell.toFixed(2)}V
                      </div>
                    ))}
                  </div>
                </div>

                {/* Motors */}
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-purple-300 mb-1">Motors (RPM)</div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="text-white text-xs">M1: {motorRPM[0]}</div>
                    <div className="text-white text-xs">M2: {motorRPM[1]}</div>
                    <div className="text-white text-xs">M3: {motorRPM[2]}</div>
                    <div className="text-white text-xs">M4: {motorRPM[3]}</div>
                  </div>
                </div>

                {/* Environment */}
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-purple-300 mb-1">Environment</div>
                  <div className="text-white">Wind: {windSpeed.toFixed(1)} m/s @ {windDirection.toFixed(0)}°</div>
                  <div className="text-white">Temp: {temperature.toFixed(1)}°C</div>
                  <div className="text-white">{pressure.toFixed(1)} hPa</div>
                </div>

                {/* Flight Controller */}
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-purple-300 mb-1">Flight Controller</div>
                  <div className="text-white">CPU: {cpuLoad.toFixed(0)}%</div>
                  <div className="text-white">Loop: {loopTime.toFixed(0)}μs</div>
                  <div className="text-white">Mode: {flightMode}</div>
                  <div className={`text-sm mt-1 font-semibold ${
                    failsafeStatus === 'OK' ? 'text-green-400' : 
                    failsafeStatus.includes('LOW') ? 'text-yellow-400' : 
                    'text-red-400 animate-pulse'
                  }`}>
                    {failsafeStatus === 'OK' ? '✓ All Systems OK' : `⚠️ ${failsafeStatus.replace(/_/g, ' ')}`}
                  </div>
                </div>

                {/* Battery Cells */}
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-purple-300 mb-1">Battery Cells (4S)</div>
                  <div className="grid grid-cols-2 gap-1">
                    {batteryCell.map((v, i) => (
                      <div key={i} className={`text-xs ${v < 3.5 ? 'text-red-400' : 'text-green-400'}`}>
                        S{i+1}: {v.toFixed(2)}V
                      </div>
                    ))}
                  </div>
                </div>

                {/* IMU Sensors */}
                <div className="bg-white/5 p-2 rounded">
                  <div className="text-purple-300 mb-1">IMU Sensors</div>
                  <div className="text-white text-xs">Accel: {acceleration.z.toFixed(2)} m/s²</div>
                  <div className="text-white text-xs">Gyro: {gyroscope.z.toFixed(3)} rad/s</div>
                  <div className="text-white text-xs">Hdg: {heading.toFixed(0)}°</div>
                </div>

                {/* Flight Stats */}
                <div className="bg-white/5 p-2 rounded col-span-2">
                  <div className="text-purple-300 mb-1">Flight Statistics</div>
                  <div className="flex justify-between">
                    <span className="text-white">Flight Time: {totalFlightTime.toFixed(1)}s</span>
                    <span className="text-white">Max Alt: {maxAltitudeReached.toFixed(1)}m</span>
                    <span className="text-white">Throttle: {throttle.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Motor Temps */}
                <div className="bg-white/5 p-2 rounded col-span-2">
                  <div className="text-purple-300 mb-1">Motor Temperatures</div>
                  <div className="flex justify-between gap-2">
                    {motorTemp.map((temp, i) => (
                      <div key={i} className="flex-1">
                        <div className={`text-xs ${temp > 70 ? 'text-red-400' : temp > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                          M{i+1}: {temp.toFixed(0)}°C
                        </div>
                        <div className="w-full bg-black/30 h-1 rounded mt-1">
                          <div 
                            className={`h-full rounded ${temp > 70 ? 'bg-red-500' : temp > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${(temp / 85) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Flight Control */}
          <div className="space-y-2 sm:space-y-4">
            <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-2xl">
              <h2 className="text-base sm:text-xl font-bold text-white mb-2 sm:mb-4 flex items-center gap-2">
                <Navigation className="text-blue-400" size={18} />
                Flight Control
              </h2>
              
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={() => setArmed(!armed)}
                  className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all duration-300 ${
                    armed
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/50'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50'
                  }`}
                >
                  {armed ? '⚠ DISARM' : '✓ ARM MOTORS'}
                </button>

                <button
                  onClick={() => armed && setFlying(!flying)}
                  disabled={!armed}
                  className={`w-full py-3 sm:py-4 px-3 sm:px-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                    !armed
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : flying
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/50'
                      : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/50'
                  }`}
                >
                  {flying ? <Square size={18} /> : <Play size={18} />}
                  {flying ? 'LAND' : 'TAKE OFF'}
                </button>
              </div>

              {/* Directional Controls */}
              <div className="mt-4 sm:mt-6">
                <div className="text-xs sm:text-sm text-purple-300 mb-2 sm:mb-3 font-semibold">Manual Control {!flying && '(Must be flying)'}</div>
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  <div />
                  <button 
                    onClick={() => moveManually('up')}
                    disabled={!flying || autoSimulation}
                    title="Move Forward"
                    className={`aspect-square rounded-lg flex items-center justify-center text-white font-bold text-xl transition-all ${
                      flying && !autoSimulation ? 'bg-white/10 hover:bg-white/20 active:bg-white/30' : 'bg-white/5 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ▲
                  </button>
                  <div />
                  <button 
                    onClick={() => moveManually('left')}
                    disabled={!flying || autoSimulation}
                    title="Move Left"
                    className={`aspect-square rounded-lg flex items-center justify-center text-white font-bold text-xl transition-all ${
                      flying && !autoSimulation ? 'bg-white/10 hover:bg-white/20 active:bg-white/30' : 'bg-white/5 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ◄
                  </button>
                  <button 
                    onClick={() => setDronePosition({ x: 10, y: 90 })}
                    disabled={!flying || autoSimulation}
                    title="Return to Base"
                    className={`aspect-square rounded-lg flex items-center justify-center text-white font-bold text-xl transition-all border-2 ${
                      flying && !autoSimulation 
                        ? 'bg-purple-500/30 hover:bg-purple-500/50 border-purple-500 active:bg-purple-500/60' 
                        : 'bg-purple-500/10 border-purple-500/30 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ●
                  </button>
                  <button 
                    onClick={() => moveManually('right')}
                    disabled={!flying || autoSimulation}
                    title="Move Right"
                    className={`aspect-square rounded-lg flex items-center justify-center text-white font-bold text-xl transition-all ${
                      flying && !autoSimulation ? 'bg-white/10 hover:bg-white/20 active:bg-white/30' : 'bg-white/5 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ►
                  </button>
                  <div />
                  <button 
                    onClick={() => moveManually('down')}
                    disabled={!flying || autoSimulation}
                    title="Move Backward"
                    className={`aspect-square rounded-lg flex items-center justify-center text-white font-bold text-xl transition-all ${
                      flying && !autoSimulation ? 'bg-white/10 hover:bg-white/20 active:bg-white/30' : 'bg-white/5 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ▼
                  </button>
                  <div />
                </div>
              </div>

              {/* Altitude Controls */}
              <div className="mt-4 sm:mt-6">
                <div className="text-xs sm:text-sm text-purple-300 mb-2 sm:mb-3 font-semibold">Altitude Control</div>
                <div className="flex gap-2 sm:gap-3 min-w-0">
                  <button 
                    onClick={() => changeAltitude('down')}
                    disabled={!flying || autoSimulation || altitude <= 0.2}
                    title="Decrease Altitude (-1m)"
                    className={`flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base transition-all flex flex-col items-center justify-center gap-1 ${
                      flying && !autoSimulation && altitude > 0.2
                        ? 'bg-gradient-to-b from-orange-500/80 to-red-500/80 text-white hover:from-orange-500 hover:to-red-500 active:scale-95 shadow-lg shadow-orange-500/30'
                        : 'bg-white/5 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="text-lg sm:text-2xl">⬇</span>
                    <span className="text-xs sm:text-sm hidden sm:block">Descend</span>
                  </button>
                  <div className="flex-1 min-w-0 bg-black/40 rounded-lg sm:rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center border-2 border-blue-500/50">
                    <div className="text-lg sm:text-2xl font-bold text-blue-400 whitespace-nowrap">{altitude.toFixed(1)}</div>
                    <div className="text-xs text-purple-300">meters</div>
                    <div className="text-xs text-gray-400 hidden sm:block whitespace-nowrap">
                      Max: {getEnvironmentPhysics(isIndoor, indoorBounds).maxAltitude}m
                    </div>
                  </div>
                  <button 
                    onClick={() => changeAltitude('up')}
                    disabled={!flying || autoSimulation || altitude >= getEnvironmentPhysics(isIndoor, indoorBounds).maxAltitude}
                    title="Increase Altitude (+1m)"
                    className={`flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-base transition-all flex flex-col items-center justify-center gap-1 ${
                      flying && !autoSimulation && altitude < getEnvironmentPhysics(isIndoor, indoorBounds).maxAltitude
                        ? 'bg-gradient-to-t from-blue-500/80 to-cyan-500/80 text-white hover:from-blue-500 hover:to-cyan-500 active:scale-95 shadow-lg shadow-blue-500/30'
                        : 'bg-white/5 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="text-lg sm:text-2xl">⬆</span>
                    <span className="text-xs sm:text-sm hidden sm:block">Climb</span>
                  </button>
                </div>
                {/* Altitude presets */}
                <div className="mt-2 sm:mt-3 grid grid-cols-4 gap-1 sm:gap-2">
                  {[5, 10, 15, 20].map(alt => {
                    const maxAlt = getEnvironmentPhysics(isIndoor, indoorBounds).maxAltitude;
                    const canSet = alt <= maxAlt;
                    return (
                      <button
                        key={alt}
                        onClick={() => {
                          if (flying && !autoSimulation && canSet) {
                            setAltitude(alt);
                            addLog(`📏 Set altitude to ${alt}m`);
                          }
                        }}
                        disabled={!flying || autoSimulation || !canSet}
                        title={canSet ? `Set to ${alt}m` : `Max: ${maxAlt}m`}
                        className={`py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                          flying && !autoSimulation && canSet
                            ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 border border-blue-500/50'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-40'
                        }`}
                      >
                        {alt}m
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mission Presets */}
            <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-2xl">
              <h2 className="text-base sm:text-xl font-bold text-white mb-2 sm:mb-4 flex items-center gap-2">
                <Settings className="text-purple-400" size={18} />
                Quick Actions
              </h2>
              
              <div className="space-y-1 sm:space-y-2">
                <button 
                  onClick={() => {
                    setTargetPosition({ x: 90, y: 20 });
                    addLog('🎯 Target updated to delivery zone');
                  }}
                  className="w-full py-2 px-4 rounded-lg text-sm transition-all bg-white/10 hover:bg-white/20 text-purple-200"
                >
                  🎯 Set Delivery Target
                </button>
                <button 
                  onClick={() => {
                    if (flying) {
                      moveToPosition(packagePosition);
                      addLog('🚁 Flying to package location');
                    }
                  }}
                  disabled={!flying || autoSimulation}
                  className={`w-full py-2 px-4 rounded-lg text-sm transition-all ${
                    flying && !autoSimulation 
                      ? 'bg-white/10 hover:bg-white/20 text-purple-200' 
                      : 'bg-white/5 text-purple-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  📦 Fly to Package
                </button>
                <button 
                  onClick={() => {
                    if (flying) {
                      moveToPosition(targetPosition);
                      addLog('🎯 Flying to delivery target');
                    }
                  }}
                  disabled={!flying || autoSimulation}
                  className={`w-full py-2 px-4 rounded-lg text-sm transition-all ${
                    flying && !autoSimulation 
                      ? 'bg-white/10 hover:bg-white/20 text-purple-200' 
                      : 'bg-white/5 text-purple-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  🎯 Fly to Target
                </button>
                <button 
                  onClick={() => {
                    if (flying) {
                      moveToPosition({ x: 10, y: 90 });
                      addLog('🏠 Returning to base');
                    }
                  }}
                  disabled={!flying || autoSimulation}
                  className={`w-full py-2 px-4 rounded-lg text-sm transition-all ${
                    flying && !autoSimulation 
                      ? 'bg-white/10 hover:bg-white/20 text-purple-200' 
                      : 'bg-white/5 text-purple-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  🏠 Return to Base
                </button>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/50 rounded-2xl p-4 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-2">Shape Mode Effects</h3>
              <div className="space-y-1 text-xs text-purple-200">
                <div>Standard: Balanced performance</div>
                <div>Wide-Grasp: Better grasp, slower</div>
                <div>Precision: High accuracy</div>
                <div>Compact: Fast travel, less grasp</div>
              </div>
            </div>

            {/* Simulation Info */}
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl border border-green-500/50 rounded-2xl p-4 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-2">💡 Quick Start</h3>
              <p className="text-green-200 text-xs leading-relaxed">
                Manual: ARM → TAKE OFF → Use controls to fly<br/>
                Auto: Click START AUTO SIMULATION for full demo
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default App;