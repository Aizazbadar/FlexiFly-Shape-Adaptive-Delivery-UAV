import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Sphere, Cylinder, Torus, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export default function Drone3D({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  flying = false,
  armed = false,
  throttle = 0,
  shapeMode = 'standard',
  graspMode = false
}) {
  const droneRef = useRef();
  const propellerRefs = [useRef(), useRef(), useRef(), useRef()];
  const morphingArmRefs = [useRef(), useRef(), useRef(), useRef()];
  const initializedRef = useRef(false);
  
  // Morphing frame positions based on mode
  // Standard: Square configuration [x, z] positions
  // Grasp: Circular/contracted configuration to wrap around objects
  const getMorphPositions = () => {
    const baseDistance = 0.45; // Distance from center in standard mode
    
    if (graspMode) {
      // Circular contracted configuration - arms move inward to grasp
      return [
        { x: 0.25, z: 0.25, angle: Math.PI / 4 },     // Front-right
        { x: -0.25, z: 0.25, angle: 3 * Math.PI / 4 }, // Front-left
        { x: -0.25, z: -0.25, angle: 5 * Math.PI / 4 }, // Back-left
        { x: 0.25, z: -0.25, angle: 7 * Math.PI / 4 }  // Back-right
      ];
    } else if (shapeMode === 'compact') {
      // Compact X configuration
      return [
        { x: baseDistance * 0.7, z: baseDistance * 0.7, angle: Math.PI / 4 },
        { x: -baseDistance * 0.7, z: baseDistance * 0.7, angle: 3 * Math.PI / 4 },
        { x: -baseDistance * 0.7, z: -baseDistance * 0.7, angle: 5 * Math.PI / 4 },
        { x: baseDistance * 0.7, z: -baseDistance * 0.7, angle: 7 * Math.PI / 4 }
      ];
    } else {
      // Standard square configuration
      return [
        { x: baseDistance, z: 0, angle: 0 },           // Right
        { x: 0, z: baseDistance, angle: Math.PI / 2 },  // Front
        { x: -baseDistance, z: 0, angle: Math.PI },     // Left
        { x: 0, z: -baseDistance, angle: 3 * Math.PI / 2 } // Back
      ];
    }
  };
  
  // Initialize arm positions on first render
  useEffect(() => {
    if (!initializedRef.current) {
      const initialPositions = getMorphPositions();
      morphingArmRefs.forEach((ref, index) => {
        if (ref.current) {
          const pos = initialPositions[index];
          ref.current.position.set(pos.x, 0, pos.z);
          ref.current.rotation.y = pos.angle;
        }
      });
      initializedRef.current = true;
    }
  }, []);
  
  // Animate propellers and morphing mechanism with realistic physics
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Apply realistic rotation from parent component (pitch, roll, yaw)
    if (droneRef.current) {
      // Convert rotation array [pitch, roll, yaw] to radians
      const [pitch, roll, yaw] = rotation.map(r => (r * Math.PI) / 180);
      
      // Apply rotations with smooth interpolation for realistic movement
      const smoothing = 0.15;
      const currentRotation = droneRef.current.rotation;
      
      // Pitch (X-axis) - nose up/down
      const targetPitch = pitch;
      currentRotation.x += (targetPitch - currentRotation.x) * smoothing;
      
      // Roll (Z-axis) - tilt left/right
      const targetRoll = roll;
      currentRotation.z += (targetRoll - currentRotation.z) * smoothing;
      
      // Yaw (Y-axis) - rotate left/right
      const targetYaw = yaw;
      // Handle wrap-around for yaw (0-360 degrees)
      let yawDiff = targetYaw - currentRotation.y;
      if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
      if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
      currentRotation.y += yawDiff * smoothing;
    }
    
    // Propeller animation - spins when armed or flying
    if (armed || flying) {
      // Base rotation speed depends on throttle and flight state
      const baseSpeed = flying ? (throttle / 100) * 80 : 10; // Idle speed when armed but not flying
      
      propellerRefs.forEach((ref, index) => {
        if (ref.current) {
          // Alternate rotation direction for quadcopter stability (CW/CCW pattern)
          // Motors 0 and 2 spin CW, Motors 1 and 3 spin CCW
          const direction = index % 2 === 0 ? 1 : -1;
          
          // Add slight variation per motor for realism (±5%)
          const variation = 1 + (Math.sin(time * 2 + index) * 0.05);
          const rotationSpeed = baseSpeed * variation * delta * direction;
          
          ref.current.rotation.y += rotationSpeed;
          
          // Blur effect at high speeds - makes blades transparent when spinning fast
          const blurAmount = (throttle / 100) * 0.6;
          const targetOpacity = flying ? Math.max(0.3, 1 - blurAmount) : 0.95;
          
          // Apply opacity to blade children (meshes)
          ref.current.children.forEach(child => {
            if (child.material && child.material.opacity !== undefined) {
              // Smooth transition to target opacity
              child.material.opacity += (targetOpacity - child.material.opacity) * 0.1;
              child.material.needsUpdate = true;
            }
          });
        }
      });
    } else {
      // When disarmed, gradually stop propellers
      propellerRefs.forEach((ref) => {
        if (ref.current) {
          // Slow down rotation with friction
          const friction = 0.92;
          ref.current.rotation.y *= friction;
          
          // Reset blade opacity to solid
          ref.current.children.forEach(child => {
            if (child.material && child.material.opacity !== undefined) {
              child.material.opacity += (1 - child.material.opacity) * 0.05;
              child.material.needsUpdate = true;
            }
          });
        }
      });
    }
    
    // Realistic hover micro-vibrations (only when flying)
    if (flying && droneRef.current) {
      // Small altitude oscillations from motor micro-adjustments
      const hoverBob = Math.sin(time * 3.5) * 0.003 + Math.sin(time * 5.2) * 0.001;
      droneRef.current.position.y = hoverBob;
      
      // Micro pitch/roll adjustments from wind and PID corrections
      const microPitch = Math.sin(time * 2.8) * 0.0008;
      const microRoll = Math.cos(time * 3.3) * 0.0008;
      droneRef.current.rotation.x += microPitch;
      droneRef.current.rotation.z += microRoll;
    }
    
    // Animate morphing arms - smooth transition to target positions
    const morphPositions = getMorphPositions();
    morphingArmRefs.forEach((ref, index) => {
      if (ref.current) {
        const target = morphPositions[index];
        const smoothing = 0.08; // Slower, more realistic morphing
        
        ref.current.position.x += (target.x - ref.current.position.x) * smoothing;
        ref.current.position.z += (target.z - ref.current.position.z) * smoothing;
        ref.current.rotation.y += (target.angle - ref.current.rotation.y) * smoothing;
      }
    });
  });

  // Advanced colors and materials based on state
  const bodyColor = flying ? '#4ade80' : armed ? '#fbbf24' : '#8b5cf6';
  const ledColor = armed ? '#ef4444' : '#94a3b8';
  const emissiveIntensity = armed ? 1.5 : 0.3;

  // Shape mode affects drone structure
  const getShapeScale = () => {
    switch(shapeMode) {
      case 'wide-grasp': return [1.4, 0.85, 1.4]; // Wider, flatter
      case 'precision': return [0.85, 1.2, 0.85]; // Narrower, taller
      case 'compact': return [0.75, 0.75, 0.75]; // Smaller overall
      default: return [1, 1, 1];
    }
  };

  const shapeScale = getShapeScale();

  return (
    <group position={position} rotation={rotation}>
      <group ref={droneRef}>
      {/* Main Body - Carbon Fiber Look */}
      <RoundedBox args={[0.7 * shapeScale[0], 0.18 * shapeScale[1], 0.7 * shapeScale[2]]} radius={0.02} smoothness={4} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial 
          color={bodyColor} 
          metalness={0.8} 
          roughness={0.2}
          emissive={bodyColor}
          emissiveIntensity={emissiveIntensity * 0.2}
        />
      </RoundedBox>
      
      {/* Top Cover Plate */}
      <Box args={[0.65 * shapeScale[0], 0.03, 0.65 * shapeScale[2]]} position={[0, 0.105, 0]} castShadow>
        <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
      </Box>
      
      {/* Central Core / Flight Controller */}
      <Cylinder args={[0.12, 0.12, 0.15]} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial color="#111827" metalness={0.95} roughness={0.05} />
      </Cylinder>
      
      {/* Status LED Ring */}
      <Torus args={[0.14, 0.015, 16, 32]} position={[0, 0.08, 0]}>
        <meshStandardMaterial 
          color={ledColor} 
          emissive={ledColor}
          emissiveIntensity={emissiveIntensity}
          toneMapped={false}
        />
      </Torus>

      {/* Morphing Arms (4 quadcopter arms) - Dynamic Configuration */}
      {[0, 1, 2, 3].map((index) => {
        return (
          <group key={`morphing-arm-${index}`} ref={morphingArmRefs[index]}>
            {/* Telescoping Arm Segments - allows length adjustment */}
            {/* Outer Segment */}
            <Cylinder args={[0.028, 0.028, 0.25 * shapeScale[0]]} position={[0.125, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.05} />
            </Cylinder>
            
            {/* Inner Segment - slightly thinner to show telescoping */}
            <Cylinder args={[0.022, 0.022, 0.2 * shapeScale[0]]} position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <meshStandardMaterial color="#1e293b" metalness={0.90} roughness={0.08} />
            </Cylinder>
            
            {/* Actuator Joint - shows morphing capability */}
            <Sphere args={[0.035]} position={[0, 0, 0]} castShadow>
              <meshStandardMaterial 
                color="#374151" 
                metalness={0.85} 
                roughness={0.15}
                emissive={graspMode ? '#f59e0b' : '#1f2937'}
                emissiveIntensity={graspMode ? 0.5 : 0}
              />
            </Sphere>
            
            {/* Servo Motor Housing at joint */}
            <Box args={[0.06, 0.08, 0.05]} position={[0, 0, 0]} castShadow>
              <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
            </Box>
            
            {/* Carbon Fiber Reinforcement */}
            <Box args={[0.3 * shapeScale[0], 0.015, 0.05]} position={[0, 0, 0]} castShadow>
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
            </Box>
            
            {/* Motor Housing at end */}
            <group position={[0.25, 0, 0]}>
              <Cylinder args={[0.09, 0.09, 0.12]} castShadow>
                <meshStandardMaterial color="#374151" metalness={0.85} roughness={0.15} />
              </Cylinder>
              {/* Motor Top Cap */}
              <Cylinder args={[0.095, 0.095, 0.02]} position={[0, 0.07, 0]} castShadow>
                <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
              </Cylinder>
              {/* Motor Cooling Vents */}
              {[0, 1, 2, 3].map(i => (
                <Box key={i} args={[0.15, 0.005, 0.01]} position={[0, 0, 0]} rotation={[0, i * Math.PI / 2, 0]}>
                  <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.3} />
                </Box>
              ))}
            </group>
            
            {/* Propeller Blades - More Realistic */}
            <group ref={propellerRefs[index]} position={[0.25, 0.09, 0]}>
              {/* Propeller Hub */}
              <Cylinder args={[0.04, 0.04, 0.015]}>
                <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.2} />
              </Cylinder>
              
              {/* Blade 1 */}
              <Box args={[0.45, 0.008, 0.06]} position={[0.225, 0, 0]} rotation={[0, 0.1, 0]} castShadow>
                <meshStandardMaterial 
                  color={flying ? '#3b82f6' : '#94a3b8'} 
                  transparent 
                  opacity={flying ? 0.4 : 0.95}
                  metalness={0.6}
                  roughness={0.2}
                  side={THREE.DoubleSide}
                />
              </Box>
              
              {/* Blade 2 */}
              <Box args={[0.45, 0.008, 0.06]} position={[-0.225, 0, 0]} rotation={[0, -0.1, 0]} castShadow>
                <meshStandardMaterial 
                  color={flying ? '#3b82f6' : '#94a3b8'} 
                  transparent 
                  opacity={flying ? 0.4 : 0.95}
                  metalness={0.6}
                  roughness={0.2}
                  side={THREE.DoubleSide}
                />
              </Box>
            </group>

            {/* Navigation LED */}
            <Sphere args={[0.025]} position={[0.2, -0.02, 0]} castShadow>
              <meshStandardMaterial 
                color={index < 2 ? '#ef4444' : '#22c55e'} 
                emissive={index < 2 ? '#ef4444' : '#22c55e'}
                emissiveIntensity={armed ? 2.5 : 0.5}
                toneMapped={false}
              />
            </Sphere>
            
            {/* Morphing Status Indicator */}
            <Sphere args={[0.015]} position={[0, 0, 0]}>
              <meshStandardMaterial 
                color={graspMode ? '#f59e0b' : '#3b82f6'} 
                emissive={graspMode ? '#f59e0b' : '#3b82f6'}
                emissiveIntensity={1.2}
                toneMapped={false}
              />
            </Sphere>
          </group>
        );
      })}

      {/* 4K Camera Gimbal System */}
      <group position={[0, -0.15, 0.25]}>
        {/* Gimbal Mount */}
        <Box args={[0.12, 0.04, 0.1]} position={[0, 0.05, 0]} castShadow>
          <meshStandardMaterial color="#374151" metalness={0.85} roughness={0.15} />
        </Box>
        
        {/* Camera Body */}
        <RoundedBox args={[0.14, 0.1, 0.12]} radius={0.01} smoothness={4} castShadow>
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
        </RoundedBox>
        
        {/* Camera Lens */}
        <Cylinder args={[0.04, 0.04, 0.06]} position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <meshStandardMaterial color="#1f2937" metalness={0.95} roughness={0.05} />
        </Cylinder>
        <Sphere args={[0.038]} position={[0, 0, 0.12]} castShadow>
          <meshStandardMaterial color="#1e3a8a" metalness={0.9} roughness={0.05} transparent opacity={0.7} />
        </Sphere>
        
        {/* Camera Sensor Indicator */}
        <Sphere args={[0.008]} position={[0, 0.03, 0.08]}>
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} toneMapped={false} />
        </Sphere>
      </group>

      {/* GPS Module */}
      <group position={[0, 0.12, 0]}>
        <Box args={[0.08, 0.02, 0.08]} castShadow>
          <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
        </Box>
        <Cylinder args={[0.015, 0.015, 0.08]} position={[0, 0.05, 0]} castShadow>
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
        </Cylinder>
      </group>

      {/* Morphing Frame Visualization - Central connecting frame */}
      {graspMode && (
        <group position={[0, -0.05, 0]}>
          {/* Connecting segments between morphing arms when in grasp mode */}
          {[0, 1, 2, 3].map((index) => {
            const angle = index * Math.PI / 2;
            return (
              <Cylinder 
                key={`connector-${index}`}
                args={[0.015, 0.015, 0.35]} 
                position={[
                  Math.cos(angle) * 0.175,
                  0,
                  Math.sin(angle) * 0.175
                ]}
                rotation={[0, angle + Math.PI / 4, Math.PI / 2]}
                castShadow
              >
                <meshStandardMaterial 
                  color="#f59e0b" 
                  metalness={0.8} 
                  roughness={0.2}
                  emissive="#f59e0b"
                  emissiveIntensity={0.3}
                />
              </Cylinder>
            );
          })}
          
          {/* Central Status Indicator for Morph Mode */}
          <Sphere args={[0.04]} position={[0, 0, 0]}>
            <meshStandardMaterial 
              color="#f59e0b" 
              emissive="#f59e0b"
              emissiveIntensity={1.5}
              toneMapped={false}
              metalness={0.9}
              roughness={0.1}
            />
          </Sphere>
        </group>
      )}

      {/* LiPo Battery Pack */}
      <RoundedBox args={[0.35, 0.09, 0.22]} radius={0.01} smoothness={4} position={[0, -0.13, 0]} castShadow>
        <meshStandardMaterial color="#1e40af" metalness={0.7} roughness={0.3} />
      </RoundedBox>
      
      {/* Battery Warning Label */}
      <Box args={[0.15, 0.02, 0.08]} position={[0, -0.085, 0]}>
        <meshStandardMaterial color="#fbbf24" metalness={0.1} roughness={0.9} />
      </Box>
      
      {/* Battery Cells Indicator */}
      {[0, 1, 2, 3].map((i) => (
        <Box key={i} args={[0.06, 0.06, 0.001]} position={[-0.105 + i * 0.07, -0.13, 0.111]} castShadow>
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
        </Box>
      ))}
      
      {/* Cooling Fans */}
      {[-0.15, 0.15].map((x, i) => (
        <group key={i} position={[x, -0.05, 0]}>
          <Cylinder args={[0.035, 0.035, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
          </Cylinder>
        </group>
      ))}
      
      {/* Landing Gear */}
      {[
        [0.3, -0.18, 0.3],
        [-0.3, -0.18, 0.3],
        [-0.3, -0.18, -0.3],
        [0.3, -0.18, -0.3]
      ].map((pos, i) => (
        <group key={i} position={pos}>
          <Cylinder args={[0.015, 0.015, 0.08]} castShadow>
            <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
          </Cylinder>
          <Sphere args={[0.025]} position={[0, -0.045, 0]} castShadow>
            <meshStandardMaterial color="#1f2937" roughness={0.4} />
          </Sphere>
        </group>
      ))}
    </group>
  </group>
  );
}
