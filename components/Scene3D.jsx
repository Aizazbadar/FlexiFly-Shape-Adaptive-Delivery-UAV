import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PerspectiveCamera, Sky, Stars, Cloud } from '@react-three/drei';
import Drone3D from './Drone3D';
import GraspableObject from './GraspableObject';
import * as THREE from 'three';
import { mapToSceneCoords } from '../utils/coordinateUtils';

// Indoor Room Component
function IndoorRoom({ bounds, packageGrabbed, graspMode, position3D }) {
  // Use actual bounds dimensions (default: 10m x 10m x 4m)
  const width = bounds.width;
  const depth = bounds.depth;
  const height = bounds.height;
  
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial 
          color="#e5e7eb" 
          roughness={0.8} 
          metalness={0}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Walls */}
      {/* Back Wall */}
      <mesh position={[0, height / 2, -depth / 2]} receiveShadow castShadow>
        <boxGeometry args={[width, height, 0.15]} />
        <meshStandardMaterial 
          color="#f3f4f6" 
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-width / 2, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, height, depth]} />
        <meshStandardMaterial 
          color="#f3f4f6" 
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Right Wall */}
      <mesh position={[width / 2, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.15, height, depth]} />
        <meshStandardMaterial 
          color="#f3f4f6" 
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.7}
          metalness={0}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Windows */}
      <mesh position={[width / 4, height / 2, -depth / 2 + 0.05]}>
        <boxGeometry args={[2, 1.5, 0.05]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.3} roughness={0.1} metalness={0.9} />
      </mesh>

      {/* Door */}
      <mesh position={[-width / 2 + 0.05, 1, depth / 4]}>
        <boxGeometry args={[0.05, 2, 1]} />
        <meshStandardMaterial color="#92400e" roughness={0.7} />
      </mesh>

      {/* Furniture - Table in corner */}
      <group position={[width / 3, 0, depth / 3]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[1.5, 0.05, 1]} />
          <meshStandardMaterial color="#78716c" roughness={0.6} />
        </mesh>
        {/* Table Legs */}
        {[[0.7, 0, 0.45], [0.7, 0, -0.45], [-0.7, 0, 0.45], [-0.7, 0, -0.45]].map((pos, i) => (
          <mesh key={i} position={pos}>
            <cylinderGeometry args={[0.03, 0.03, 0.8]} />
            <meshStandardMaterial color="#57534e" />
          </mesh>
        ))}
      </group>

      {/* Shelf with packages - positioned against wall */}
      <group position={[-width / 3, 0, depth / 4]}>
        {/* Shelf surface */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.8, 0.02, 0.4]} />
          <meshStandardMaterial color="#78716c" roughness={0.7} />
        </mesh>
        
        {/* Shelf legs */}
        {[[-0.35, 0.25, -0.15], [0.35, 0.25, -0.15], [-0.35, 0.25, 0.15], [0.35, 0.25, 0.15]].map((pos, i) => (
          <mesh key={i} position={pos}>
            <cylinderGeometry args={[0.02, 0.02, 0.5]} />
            <meshStandardMaterial color="#57534e" />
          </mesh>
        ))}
        
        {/* Objects on shelf */}
        <GraspableObject 
          type="package" 
          position={[0, 0.62, 0]} 
          isGrabbed={packageGrabbed && graspMode}
          dronePosition={position3D}
        />
        {!packageGrabbed && (
          <>
            <GraspableObject type="medical" position={[0.25, 0.62, 0]} />
            <GraspableObject type="electronics" position={[-0.25, 0.62, 0]} />
          </>
        )}
      </group>

      {/* Delivery target marker on floor - center of room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -depth / 3]}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshStandardMaterial 
          color="#10b981" 
          emissive="#10b981" 
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      
      {/* Target center glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -depth / 3]}>
        <circleGeometry args={[0.15, 32]} />
        <meshStandardMaterial 
          color="#22c55e" 
          emissive="#22c55e" 
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Indoor Lighting - optimized */}
      <pointLight position={[0, height - 0.5, 0]} intensity={0.8} castShadow={false} />
      <pointLight position={[width / 3, height * 0.7, depth / 3]} intensity={0.4} castShadow={false} />
      <pointLight position={[-width / 3, height * 0.7, -depth / 3]} intensity={0.4} castShadow={false} />
    </group>
  );
}

// Outdoor Terrain Component
function OutdoorTerrain({ packageGrabbed, graspMode, position3D }) {
  return (
    <group>
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#10b981" roughness={0.9} />
      </mesh>

      {/* Buildings */}
      {/* Building 1 */}
      <mesh position={[-8, 3, -10]} castShadow receiveShadow>
        <boxGeometry args={[4, 6, 4]} />
        <meshStandardMaterial color="#6b7280" roughness={0.7} />
      </mesh>

      {/* Building 2 */}
      <mesh position={[10, 4, -8]} castShadow receiveShadow>
        <boxGeometry args={[5, 8, 5]} />
        <meshStandardMaterial color="#4b5563" roughness={0.7} />
      </mesh>

      {/* Building 3 */}
      <mesh position={[-12, 2.5, 8]} castShadow receiveShadow>
        <boxGeometry args={[3, 5, 3]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.7} />
      </mesh>

      {/* Trees */}
      {[
        [5, 0, 5],
        [-6, 0, 7],
        [8, 0, 12],
        [-10, 0, -5]
      ].map((pos, i) => (
        <group key={`tree-${i}`} position={pos}>
          {/* Trunk */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 1]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Foliage */}
          <mesh position={[0, 1.5, 0]}>
            <coneGeometry args={[0.8, 1.5, 8]} />
            <meshStandardMaterial color="#166534" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Landing Pad */}
      <group position={[0, 0.02, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2, 32]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.3} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[1.8, 2, 32]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Delivery Station with Multiple Packages */}
      <group position={[3, 0, 4]}>
        {/* Platform */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[1.5, 0.04, 1.5]} />
          <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.4} />
        </mesh>
        
        {/* Packages - main one can be grabbed */}
        <GraspableObject 
          type="package" 
          position={[0, 0.15, 0]} 
          isGrabbed={packageGrabbed && graspMode}
          dronePosition={position3D}
        />
        {!packageGrabbed && (
          <>
            <GraspableObject type="food" position={[0.4, 0.14, 0]} />
            <GraspableObject type="medical" position={[-0.4, 0.13, 0.3]} />
            <GraspableObject type="electronics" position={[0.3, 0.16, -0.3]} />
          </>
        )}
        
        {/* Platform Lights */}
        {[-0.6, 0.6].map((x, i) => (
          <mesh key={i} position={[x, 0.05, 0.6]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.1]} />
            <meshStandardMaterial 
              color="#3b82f6" 
              emissive="#3b82f6" 
              emissiveIntensity={1.5}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>

      {/* Advanced Delivery Target with Hologram Effect */}
      <group position={[9, 0, 2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshStandardMaterial 
            color="#10b981" 
            emissive="#10b981" 
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
        
        {/* Inner glow rings */}
        {[0.25, 0.35].map((radius, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03 + i * 0.01, 0]}>
            <ringGeometry args={[radius - 0.02, radius, 32]} />
            <meshStandardMaterial 
              color="#22c55e" 
              emissive="#22c55e" 
              emissiveIntensity={0.8 - i * 0.2}
              transparent
              opacity={0.5}
            />
          </mesh>
        ))}
        
        {/* Holographic Pillars */}
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => {
          const x = Math.cos(angle) * 0.45;
          const z = Math.sin(angle) * 0.45;
          return (
            <mesh key={i} position={[x, 0.5, z]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 1]} />
              <meshStandardMaterial 
                color="#10b981" 
                emissive="#10b981" 
                emissiveIntensity={1}
                transparent
                opacity={0.6}
              />
            </mesh>
          );
        })}
      </group>

      {/* Outdoor Lighting */}
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <ambientLight intensity={0.5} />
    </group>
  );
}

export default function Scene3D({ 
  dronePosition, 
  altitude = 0,
  pitch = 0,
  roll = 0,
  yaw = 0,
  flying = false,
  armed = false,
  throttle = 0,
  shapeMode = 'standard',
  graspMode = false,
  isIndoor = false,
  indoorBounds = { width: 10, depth: 10, height: 4 },
  packageGrabbed = false
}) {
  // Convert map (0-100) position to 3D meters using shared utility
  const { x, z } = mapToSceneCoords(dronePosition, {
    isIndoor,
    indoorBounds,
    margin: isIndoor ? 0.3 : 0
  });
  
  // Altitude: use the altitude prop (separate from position)
  // When not flying, keep drone just above ground
  const y = flying ? Math.max(0.2, altitude) : 0.2;
  
  // Indoor bounds checking for visualization
  const position3D = isIndoor ? [
    Math.max(-indoorBounds.width / 2, Math.min(indoorBounds.width / 2, x)),
    Math.min(indoorBounds.height, y),
    Math.max(-indoorBounds.depth / 2, Math.min(indoorBounds.depth / 2, z))
  ] : [x, y, z];

  // Camera settings based on environment - optimized for smooth viewing
  const cameraPosition = isIndoor ? [8, 4, 8] : [15, 12, 15];
  const cameraTarget = isIndoor ? [0, 2, 0] : [0, 2, 0];
  const cameraFov = isIndoor ? 65 : 60;
  
  return (
    <div className="w-full h-full" style={{ background: isIndoor ? '#e5e7eb' : '#87ceeb' }}>
      <Canvas 
        shadows={!isIndoor}
        camera={{ position: cameraPosition, fov: cameraFov }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          preserveDrawingBuffer: false
        }}
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        frameloop="always"
        performance={{ min: 0.5, max: 1 }}
        flat
        linear
      >
        <PerspectiveCamera makeDefault position={cameraPosition} fov={cameraFov} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.5}
          minDistance={isIndoor ? 4 : 5}
          maxDistance={isIndoor ? 20 : 50}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={Math.PI / 12}
          enablePan={true}
          target={cameraTarget}
          makeDefault
        />

        {/* Optimized Lighting for smooth performance */}
        <ambientLight intensity={isIndoor ? 0.8 : 0.6} />
        <directionalLight 
          position={isIndoor ? [5, 8, 5] : [10, 10, 5]} 
          intensity={isIndoor ? 0.8 : 1} 
          castShadow 
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={isIndoor ? -15 : -30}
          shadow-camera-right={isIndoor ? 15 : 30}
          shadow-camera-top={isIndoor ? 15 : 30}
          shadow-camera-bottom={isIndoor ? -15 : -30}
          shadow-camera-near={0.5}
          shadow-camera-far={50}
          shadow-bias={-0.0001}
        />
        {!isIndoor && <pointLight position={[0, 5, 0]} intensity={0.5} />}
        <hemisphereLight args={['#87ceeb', '#f3f4f6', 0.3]} />

        {/* Environment */}
        {isIndoor ? (
          <>
            <IndoorRoom bounds={indoorBounds} packageGrabbed={packageGrabbed} graspMode={graspMode} position3D={position3D} />
            <fog attach="fog" args={['#f3f4f6', 15, 30]} />
          </>
        ) : (
          <>
            <Sky 
              distance={450000}
              sunPosition={[100, 20, 100]}
              inclination={0.6}
              azimuth={0.25}
            />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            {/* Realistic clouds */}
            <Cloud position={[10, 8, -15]} speed={0.2} opacity={0.3} />
            <Cloud position={[-12, 10, -20]} speed={0.15} opacity={0.25} />
            <Cloud position={[15, 12, 10]} speed={0.18} opacity={0.28} />
            <OutdoorTerrain packageGrabbed={packageGrabbed} graspMode={graspMode} position3D={position3D} />
            <Environment preset="city" />
            <fog attach="fog" args={['#87ceeb', 30, 100]} />
          </>
        )}

        {/* Grid Helper - only show subtle grid */}
        {!isIndoor && (
          <Grid 
            args={[50, 50]}
            cellColor="#6b7280"
            sectionColor="#4b5563"
            fadeDistance={50}
            fadeStrength={1}
            cellSize={2}
          />
        )}

        {/* Drone with optimized lighting */}
        <group>
          <Drone3D 
            position={position3D}
            rotation={[pitch, roll, yaw]}
            flying={flying}
            armed={armed}
            throttle={throttle}
            shapeMode={shapeMode}
            graspMode={graspMode}
          />
          {/* Simplified lighting - only outdoors or when flying high */}
          {(!isIndoor || position3D[1] > 2) && (
            <spotLight
              position={[position3D[0], position3D[1] + 4, position3D[2]]}
              angle={0.5}
              penumbra={0.8}
              intensity={0.6}
              castShadow={false}
            />
          )}
          {/* Ground position marker - subtle */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position3D[0], 0.01, position3D[2]]}>
            <ringGeometry args={[0.25, 0.35, 24]} />
            <meshBasicMaterial 
              color={flying ? '#10b981' : '#a855f7'} 
              opacity={0.4} 
              transparent 
              depthWrite={false}
            />
          </mesh>
        </group>
      </Canvas>
    </div>
  );
}
