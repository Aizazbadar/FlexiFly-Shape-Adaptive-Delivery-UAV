import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import Drone3D from './Drone3D';

export default function Drone3DMiniView({ 
  droneRotation = [0, 0, 0],
  flying = false,
  armed = false,
  throttle = 0,
  shapeMode = 'standard',
  graspMode = false,
  altitude = 0
}) {
  // Simple centered position with altitude
  const position3D = [
    0,
    Math.max(altitude * 0.05 + 0.5, 0.5),
    0
  ];

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border-2 border-purple-500/50" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }}>
        <PerspectiveCamera makeDefault position={[3, 2, 3]} fov={50} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.1}
          minDistance={1.5}
          maxDistance={10}
          enablePan={false}
          target={[0, 1, 0]}
        />

        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[0, 3, 0]} intensity={0.6} color="#a855f7" />
        <hemisphereLight args={['#87ceeb', '#2d3748', 0.5]} />

        {/* Ground plane for reference */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#1e293b" opacity={0.5} transparent />
        </mesh>

        {/* Grid */}
        <gridHelper args={[10, 10, '#4b5563', '#374151']} position={[0, 0, 0]} />

        {/* Drone */}
        <Drone3D 
          position={position3D}
          rotation={droneRotation}
          flying={flying}
          armed={armed}
          throttle={throttle}
          shapeMode={shapeMode}
          graspMode={graspMode}
        />

        {/* Altitude reference line with gradient */}
        {altitude > 0 && (
          <>
            <mesh position={[0, altitude * 0.025 + 0.25, 0]}>
              <cylinderGeometry args={[0.01, 0.01, altitude * 0.05 + 0.5]} />
              <meshBasicMaterial color="#a855f7" opacity={0.4} transparent />
            </mesh>
            {/* Ground shadow projection */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <circleGeometry args={[0.3, 32]} />
              <meshBasicMaterial color="#000000" opacity={0.3 * Math.min(1, altitude / 50)} transparent />
            </mesh>
          </>
        )}
        
        {/* Flight path trail effect */}
        {flying && (
          <mesh position={[0, position3D[1] - 0.1, 0]}>
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial color="#4ade80" opacity={0.2} transparent />
          </mesh>
        )}
        
        {/* Coordinate axes helper */}
        <group position={[0, 0.01, 0]}>
          {/* X axis - Red */}
          <mesh position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.005, 0.005, 0.6]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          {/* Z axis - Blue */}
          <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.6]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
        </group>
      </Canvas>
    </div>
  );
}
