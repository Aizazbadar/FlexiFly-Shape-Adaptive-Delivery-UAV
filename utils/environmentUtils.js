// Indoor/Outdoor Environment Utilities

// Get user's current location using Geolocation API
export async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || 0,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// Watch position for continuous updates
export function watchCurrentLocation(callback, errorCallback) {
  if (!navigator.geolocation) {
    errorCallback(new Error('Geolocation is not supported'));
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || 0,
        heading: position.coords.heading || 0,
        speed: position.coords.speed || 0
      });
    },
    errorCallback,
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  );

  return watchId;
}

// Stop watching position
export function stopWatchingLocation(watchId) {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }
}

// Indoor bounds configuration (in meters - actual physical dimensions)
export const INDOOR_BOUNDS = {
  small: {
    width: 5,  // meters - 5m room
    depth: 5,
    height: 3,  // 3m ceiling
    maxSpeed: 3,  // m/s
    maxAltitude: 2.5,  // m
    name: 'Small Room (5x5x3m)'
  },
  medium: {
    width: 10,  // 10m room (default)
    depth: 10,
    height: 4,  // 4m ceiling
    maxSpeed: 5,
    maxAltitude: 3.5,
    name: 'Medium Room (10x10x4m)'
  },
  large: {
    width: 20,  // 20m warehouse
    depth: 20,
    height: 8,  // 8m ceiling
    maxSpeed: 10,
    maxAltitude: 7,
    name: 'Large Warehouse (20x20x8m)'
  },
  gym: {
    width: 30,  // 30m gymnasium
    depth: 20,  // 20m depth
    height: 10,  // 10m ceiling
    maxSpeed: 12,
    maxAltitude: 9,
    name: 'Gymnasium (30x20x10m)'
  }
};

// Check if drone is within indoor bounds with enhanced proximity detection
// position: {x, y, z} where x,y are 3D coordinates in meters, z is altitude
export function checkIndoorBounds(position, bounds, margin = 0.5) {
  const halfWidth = bounds.width / 2;
  const halfDepth = bounds.depth / 2;

  // position.x and position.z are already in meters (converted from map coordinates)
  const withinX = Math.abs(position.x) < (halfWidth - margin);
  const withinZ = Math.abs(position.z) < (halfDepth - margin);
  const withinY = position.y >= 0.1 && position.y < (bounds.height - margin);

  // Calculate actual distances to each boundary
  const distToWallX = halfWidth - Math.abs(position.x);
  const distToWallZ = halfDepth - Math.abs(position.z);
  const distToCeiling = bounds.height - position.y;
  const distToFloor = position.y;

  // Determine proximity warnings (within warning distance but not collision)
  const warningDistance = 0.5; // meters
  const proximityWarnings = {
    nearWallX: distToWallX < warningDistance && distToWallX > margin,
    nearWallZ: distToWallZ < warningDistance && distToWallZ > margin,
    nearCeiling: distToCeiling < warningDistance && distToCeiling > margin,
    nearFloor: distToFloor < 0.3 && distToFloor > 0.1
  };

  return {
    withinBounds: withinX && withinZ && withinY,
    violations: {
      x: !withinX,
      y: !withinY,
      z: !withinZ
    },
    distances: {
      toWallX: distToWallX,
      toWallZ: distToWallZ,
      toCeiling: distToCeiling,
      toFloor: distToFloor
    },
    proximityWarnings,
    // Calculate closest boundary for emergency response
    closestBoundary: Math.min(distToWallX, distToWallZ, distToCeiling, distToFloor),
    boundaryType: [
      { dist: distToWallX, name: 'wall-x' },
      { dist: distToWallZ, name: 'wall-z' },
      { dist: distToCeiling, name: 'ceiling' },
      { dist: distToFloor, name: 'floor' }
    ].sort((a, b) => a.dist - b.dist)[0].name
  };
}

// Constrain position within indoor bounds with smooth collision response
// Returns constrained 3D position {x, y, z} in meters
export function constrainToIndoorBounds(position, bounds, margin = 0.5) {
  const halfWidth = bounds.width / 2;
  const halfDepth = bounds.depth / 2;

  // Soft constraint zone - gradually slow down before hard boundary
  const softZone = 0.3; // 30cm soft constraint zone
  
  // Constrain X (width) with soft boundaries
  let constrainedX = position.x;
  if (Math.abs(position.x) > halfWidth - margin - softZone) {
    // In soft zone - apply gradual constraint
    const overshoot = Math.abs(position.x) - (halfWidth - margin - softZone);
    const dampening = 1 - (overshoot / softZone);
    constrainedX = Math.sign(position.x) * (halfWidth - margin - softZone + overshoot * Math.max(0, dampening));
  }
  constrainedX = Math.max(
    -(halfWidth - margin),
    Math.min(halfWidth - margin, constrainedX)
  );

  // Constrain Z (depth) with soft boundaries
  let constrainedZ = position.z;
  if (Math.abs(position.z) > halfDepth - margin - softZone) {
    const overshoot = Math.abs(position.z) - (halfDepth - margin - softZone);
    const dampening = 1 - (overshoot / softZone);
    constrainedZ = Math.sign(position.z) * (halfDepth - margin - softZone + overshoot * Math.max(0, dampening));
  }
  constrainedZ = Math.max(
    -(halfDepth - margin),
    Math.min(halfDepth - margin, constrainedZ)
  );

  // Constrain Y (altitude/height) with soft boundaries
  let constrainedY = position.y;
  
  // Floor constraint with soft landing
  if (position.y < 0.2 + softZone) {
    const deficit = (0.2 + softZone) - position.y;
    const cushioning = 1 - (deficit / softZone);
    constrainedY = 0.2 + softZone - deficit * Math.max(0, cushioning);
  }
  
  // Ceiling constraint with soft bounce
  if (position.y > bounds.height - margin - softZone) {
    const overshoot = position.y - (bounds.height - margin - softZone);
    const dampening = 1 - (overshoot / softZone);
    constrainedY = bounds.height - margin - softZone + overshoot * Math.max(0, dampening);
  }
  
  constrainedY = Math.max(
    0.2,
    Math.min(bounds.height - margin, constrainedY)
  );

  // Return constrained 3D position in meters with collision metadata
  return {
    x: constrainedX,
    y: constrainedY,
    z: constrainedZ,
    wasConstrained: constrainedX !== position.x || constrainedY !== position.y || constrainedZ !== position.z
  };
}

// Get physics parameters for environment
export function getEnvironmentPhysics(isIndoor, indoorBounds = INDOOR_BOUNDS.medium) {
  if (isIndoor) {
    return {
      maxSpeed: indoorBounds.maxSpeed,
      maxAltitude: indoorBounds.maxAltitude,
      windStrength: 0,  // No wind indoors
      windVariation: 0,
      gpsAccuracy: 0.1,  // Better GPS indoors (simulated)
      signalStrength: 100,  // Perfect signal indoors
      batteryDrainMultiplier: 0.8,  // Less drain indoors (no wind resistance)
      accelerationMultiplier: 0.7,  // Slower acceleration for safety
      turningMultiplier: 0.8,  // Gentler turns
      collisionChecking: true,
      obstacles: true
    };
  } else {
    return {
      maxSpeed: 25,
      maxAltitude: 120,
      windStrength: 5,
      windVariation: 0.3,
      gpsAccuracy: 1.5,
      signalStrength: 98,
      batteryDrainMultiplier: 1.0,
      accelerationMultiplier: 1.0,
      turningMultiplier: 1.0,
      collisionChecking: false,
      obstacles: false
    };
  }
}

// Calculate realistic propeller physics
export function calculatePropellerThrust(rpm, airDensity = 1.225) {
  // Thrust = Ct * ρ * n² * D⁴
  // Ct = thrust coefficient (~0.1 for typical props)
  // ρ = air density (kg/m³)
  // n = rotations per second
  // D = propeller diameter (m)
  
  const Ct = 0.1;
  const D = 0.25; // 10 inch prop = 0.25m
  const n = rpm / 60; // Convert RPM to RPS
  
  const thrust = Ct * airDensity * Math.pow(n, 2) * Math.pow(D, 4);
  return thrust; // Newtons
}

// Calculate power consumption
export function calculatePowerConsumption(rpm, thrust, motorEfficiency = 0.85) {
  // Power (W) = Thrust (N) * Velocity (m/s) / Efficiency
  // Simplified model for hover
  const velocity = rpm * 0.00015; // Approximate tip speed
  const power = (thrust * velocity) / motorEfficiency;
  return power; // Watts
}

// PID Controller for stabilization
export class PIDController {
  constructor(kp, ki, kd) {
    this.kp = kp || 1.0;
    this.ki = ki || 0.1;
    this.kd = kd || 0.5;
    this.integral = 0;
    this.previousError = 0;
  }

  calculate(setpoint, measured, dt) {
    const error = setpoint - measured;
    this.integral += error * dt;
    
    // Anti-windup
    this.integral = Math.max(-10, Math.min(10, this.integral));
    
    const derivative = (error - this.previousError) / dt;
    this.previousError = error;
    
    return (this.kp * error) + (this.ki * this.integral) + (this.kd * derivative);
  }

  reset() {
    this.integral = 0;
    this.previousError = 0;
  }
}

// Gyroscope simulation
export function simulateGyroscope(angularVelocity, drift = 0.001) {
  return {
    x: angularVelocity.x + (Math.random() - 0.5) * drift,
    y: angularVelocity.y + (Math.random() - 0.5) * drift,
    z: angularVelocity.z + (Math.random() - 0.5) * drift
  };
}

// Accelerometer simulation
export function simulateAccelerometer(acceleration, noise = 0.1) {
  return {
    x: acceleration.x + (Math.random() - 0.5) * noise,
    y: acceleration.y + (Math.random() - 0.5) * noise,
    z: acceleration.z + 9.81 + (Math.random() - 0.5) * noise // Include gravity
  };
}

// Obstacle detection (simple ray casting)
export function detectObstacles(position, direction, range, obstacles) {
  // Simplified obstacle detection
  for (const obstacle of obstacles) {
    const dx = obstacle.x - position.x;
    const dy = obstacle.y - position.y;
    const dz = obstacle.z - position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance < range) {
      return {
        detected: true,
        distance,
        obstacle
      };
    }
  }
  
  return { detected: false };
}

// Convert map coordinates (0-100) to 3D scene coordinates (meters)
// Map coordinates: origin (0,0) = top-left, (100,100) = bottom-right
// 3D coordinates: origin (0,0) = center, +X = right, +Z = back, +Y = up
export function mapToSceneCoords(mapPos, context) {
  const { isIndoor, indoorBounds } = context;
  
  if (isIndoor) {
    // Map percentage to real-world meters
    // Center the coordinate system: (50, 50) on map = (0, 0) in 3D
    const x = ((mapPos.x - 50) / 50) * (indoorBounds.width / 2);
    const z = ((mapPos.y - 50) / 50) * (indoorBounds.depth / 2);
    return { x, z };
  } else {
    // Outdoor: similar conversion but with larger scale
    const scale = 2; // 100 map units = 200 meters
    const x = ((mapPos.x - 50) / 50) * (100 * scale);
    const z = ((mapPos.y - 50) / 50) * (100 * scale);
    return { x, z };
  }
}

// Convert 3D scene coordinates (meters) to map coordinates (0-100)
export function sceneToMapCoords(scenePos, context) {
  const { isIndoor, indoorBounds } = context;
  
  if (isIndoor) {
    // Convert meters back to map percentage
    const x = 50 + (scenePos.x / (indoorBounds.width / 2)) * 50;
    const y = 50 + (scenePos.z / (indoorBounds.depth / 2)) * 50;
    return { x, y };
  } else {
    // Outdoor conversion
    const scale = 2;
    const x = 50 + (scenePos.x / (100 * scale)) * 50;
    const y = 50 + (scenePos.z / (100 * scale)) * 50;
    return { x, y };
  }
}

// Calculate real-world distance in meters between two map positions
export function mapDistanceToMeters(pos1, pos2, context) {
  const { isIndoor, indoorBounds } = context;
  
  // Convert both positions to 3D coordinates
  const scene1 = mapToSceneCoords(pos1, context);
  const scene2 = mapToSceneCoords(pos2, context);
  
  // Calculate Euclidean distance in meters
  const dx = scene2.x - scene1.x;
  const dz = scene2.z - scene1.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  
  return distance;
}
