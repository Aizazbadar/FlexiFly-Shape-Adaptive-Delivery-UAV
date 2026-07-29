import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Component to handle map center updates
function MapUpdater({ center, zoomLevel }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && zoomLevel) {
      map.setView(center, zoomLevel, {
        animate: true,
        duration: 1
      });
    }
  }, [center, zoomLevel, map]);
  
  return null;
}

export default function MapView({ 
  dronePosition, 
  basePosition, 
  packagePosition, 
  targetPosition,
  flightPath,
  flying,
  altitude,
  mapType = 'satellite',
  centerOn = null // Can be 'base', 'drone', etc.
}) {
  // Map type URLs
  const mapLayers = {
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
  };

  // Determine which position to center on
  let mapCenter = [dronePosition.lat, dronePosition.lon];
  let zoomLevel = 17;
  
  if (centerOn === 'base') {
    mapCenter = [basePosition.lat, basePosition.lon];
    zoomLevel = 18; // Zoom in closer when centering on location
  }

  return (
    <MapContainer 
      center={mapCenter} 
      zoom={17} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <MapUpdater center={centerOn ? mapCenter : null} zoomLevel={centerOn ? zoomLevel : null} />
      <TileLayer
        url={mapLayers[mapType]}
        attribution={mapType === 'satellite' 
          ? '&copy; Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
          : '&copy; OpenStreetMap contributors'}
        maxZoom={19}
      />

      {/* Base Station */}
      <Marker position={[basePosition.lat, basePosition.lon]}>
        <Popup>
          <strong>🏠 Base Station</strong><br/>
          Lat: {basePosition.lat.toFixed(6)}<br/>
          Lon: {basePosition.lon.toFixed(6)}
        </Popup>
      </Marker>

      {/* Package Location */}
      <Marker position={[packagePosition.lat, packagePosition.lon]}>
        <Popup>
          <strong>📦 Package Pickup</strong><br/>
          Lat: {packagePosition.lat.toFixed(6)}<br/>
          Lon: {packagePosition.lon.toFixed(6)}
        </Popup>
      </Marker>

      {/* Delivery Target */}
      <Marker position={[targetPosition.lat, targetPosition.lon]}>
        <Popup>
          <strong>🎯 Delivery Target</strong><br/>
          Lat: {targetPosition.lat.toFixed(6)}<br/>
          Lon: {targetPosition.lon.toFixed(6)}
        </Popup>
      </Marker>

      {/* Drone Position */}
      <Circle
        center={[dronePosition.lat, dronePosition.lon]}
        radius={5}
        pathOptions={{ 
          color: flying ? '#4ade80' : '#a855f7',
          fillColor: flying ? '#4ade80' : '#a855f7',
          fillOpacity: 0.8
        }}
      >
        <Popup>
          <strong>🚁 Drone</strong><br/>
          Lat: {dronePosition.lat.toFixed(6)}<br/>
          Lon: {dronePosition.lon.toFixed(6)}<br/>
          Alt: {altitude.toFixed(1)}m<br/>
          Status: {flying ? 'FLYING' : 'GROUNDED'}
        </Popup>
      </Circle>

      {/* Flight Path */}
      {flightPath.length > 1 && (
        <Polyline 
          positions={flightPath.map(p => [p.lat, p.lon])} 
          pathOptions={{ color: '#3b82f6', weight: 2, opacity: 0.7 }}
        />
      )}
    </MapContainer>
  );
}
