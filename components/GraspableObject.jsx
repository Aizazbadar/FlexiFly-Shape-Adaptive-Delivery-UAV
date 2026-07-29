import { RoundedBox, Box, Sphere, Cylinder } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function GraspableObject({ 
  type = 'package',
  position = [0, 0, 0],
  isGrabbed = false,
  dronePosition = [0, 0, 0]
}) {
  const objectRef = useRef();
  const initialPositionRef = useRef([...position]); // Copy array to prevent reference issues
  const wasGrabbedRef = useRef(false);
  
  useFrame(() => {
    if (!objectRef.current) return;
    
    if (isGrabbed) {
      // Smoothly follow drone when grabbed - with much smoother interpolation
      const targetPos = [
        dronePosition[0], 
        dronePosition[1] - 0.35, // Slightly below drone
        dronePosition[2]
      ];
      
      // Very smooth following with exponential smoothing
      const smoothing = 0.08; // Reduced for smoother movement
      objectRef.current.position.x += (targetPos[0] - objectRef.current.position.x) * smoothing;
      objectRef.current.position.y += (targetPos[1] - objectRef.current.position.y) * smoothing;
      objectRef.current.position.z += (targetPos[2] - objectRef.current.position.z) * smoothing;
      
      // Very subtle swing animation when grabbed (reduced amplitude)
      const time = Date.now() * 0.001;
      objectRef.current.rotation.x = Math.sin(time * 1.2) * 0.02;
      objectRef.current.rotation.z = Math.cos(time * 0.8) * 0.02;
      
      wasGrabbedRef.current = true;
    } else {
      // Smooth return to initial position when released
      if (wasGrabbedRef.current) {
        const returnSmoothing = 0.12;
        const dx = initialPositionRef.current[0] - objectRef.current.position.x;
        const dy = initialPositionRef.current[1] - objectRef.current.position.y;
        const dz = initialPositionRef.current[2] - objectRef.current.position.z;
        
        // Check if close enough to snap to final position
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 && Math.abs(dz) < 0.01) {
          objectRef.current.position.set(...initialPositionRef.current);
          objectRef.current.rotation.set(0, 0, 0);
          wasGrabbedRef.current = false;
        } else {
          // Smooth return
          objectRef.current.position.x += dx * returnSmoothing;
          objectRef.current.position.y += dy * returnSmoothing;
          objectRef.current.position.z += dz * returnSmoothing;
          
          // Smooth rotation return
          objectRef.current.rotation.x *= 0.9;
          objectRef.current.rotation.z *= 0.9;
        }
      }
    }
  });
  
  if (type === 'package') {
    return (
      <group ref={objectRef} position={initialPositionRef.current}>
        {/* Cardboard Box */}
        <RoundedBox args={[0.2, 0.2, 0.2]} radius={0.01} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#92400e" roughness={0.8} metalness={0.1} />
        </RoundedBox>
        
        {/* Packing Tape */}
        <Box args={[0.205, 0.01, 0.205]} position={[0, 0.1, 0]}>
          <meshStandardMaterial color="#fbbf24" roughness={0.3} metalness={0.2} transparent opacity={0.7} />
        </Box>
        <Box args={[0.01, 0.205, 0.205]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#fbbf24" roughness={0.3} metalness={0.2} transparent opacity={0.7} />
        </Box>
        
        {/* Fragile Label */}
        <Box args={[0.08, 0.06, 0.001]} position={[0, 0, 0.101]}>
          <meshStandardMaterial color="#ef4444" roughness={0.9} />
        </Box>
        
        {/* Barcode */}
        <Box args={[0.1, 0.04, 0.001]} position={[0, 0.04, 0.101]}>
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </Box>
      </group>
    );
  }
  
  if (type === 'medical') {
    return (
      <group ref={objectRef} position={initialPositionRef.current}>
        {/* White Medical Container */}
        <RoundedBox args={[0.18, 0.15, 0.18]} radius={0.01} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.4} metalness={0.3} />
        </RoundedBox>
        
        {/* Red Cross */}
        <Box args={[0.12, 0.02, 0.001]} position={[0, 0, 0.091]}>
          <meshStandardMaterial color="#dc2626" roughness={0.7} emissive="#dc2626" emissiveIntensity={0.3} />
        </Box>
        <Box args={[0.02, 0.12, 0.001]} position={[0, 0, 0.091]}>
          <meshStandardMaterial color="#dc2626" roughness={0.7} emissive="#dc2626" emissiveIntensity={0.3} />
        </Box>
        
        {/* Handle */}
        <Box args={[0.15, 0.02, 0.02]} position={[0, 0.09, 0]}>
          <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
        </Box>
      </group>
    );
  }
  
  if (type === 'electronics') {
    return (
      <group ref={objectRef} position={initialPositionRef.current}>
        {/* Black Electronics Box */}
        <RoundedBox args={[0.25, 0.12, 0.18]} radius={0.015} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
        </RoundedBox>
        
        {/* Brand Logo Area */}
        <Box args={[0.08, 0.04, 0.001]} position={[0, 0.02, 0.091]}>
          <meshStandardMaterial color="#3b82f6" roughness={0.5} emissive="#3b82f6" emissiveIntensity={0.2} />
        </Box>
        
        {/* Warning Stickers */}
        <Sphere args={[0.015]} position={[-0.1, 0, 0.091]}>
          <meshStandardMaterial color="#fbbf24" roughness={0.7} />
        </Sphere>
        
        {/* Ventilation Slots */}
        {[-0.06, -0.03, 0, 0.03, 0.06].map((x, i) => (
          <Box key={i} args={[0.02, 0.08, 0.001]} position={[x, -0.01, 0.091]}>
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </Box>
        ))}
      </group>
    );
  }
  
  if (type === 'food') {
    return (
      <group ref={objectRef} position={initialPositionRef.current}>
        {/* Insulated Food Container */}
        <Cylinder args={[0.12, 0.12, 0.18]} castShadow receiveShadow>
          <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.6} />
        </Cylinder>
        
        {/* Lid */}
        <Cylinder args={[0.125, 0.125, 0.02]} position={[0, 0.1, 0]} castShadow>
          <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.7} />
        </Cylinder>
        
        {/* Hot/Cold Indicator */}
        <Cylinder args={[0.03, 0.03, 0.001]} position={[0, 0.111, 0]}>
          <meshStandardMaterial 
            color="#ef4444" 
            roughness={0.8} 
            emissive="#ef4444" 
            emissiveIntensity={0.5}
          />
        </Cylinder>
        
        {/* Handle Ring */}
        <Box args={[0.15, 0.03, 0.02]} position={[0, 0.12, 0]}>
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </Box>
      </group>
    );
  }
  
  // Default sphere object
  return (
    <group ref={objectRef} position={initialPositionRef.current}>
      <Sphere args={[0.1]} castShadow receiveShadow>
        <meshStandardMaterial color="#8b5cf6" roughness={0.4} metalness={0.6} />
      </Sphere>
    </group>
  );
}
