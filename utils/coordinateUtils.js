export const MAP_SIZE = 100;
export const OUTDOOR_BOUNDS = {
  width: 50,  // meters represented by the grid along X
  depth: 50   // meters represented by the grid along Z
};

export function clampMapPosition(position, margin = 5) {
  return {
    x: Math.max(margin, Math.min(MAP_SIZE - margin, position.x)),
    y: Math.max(margin, Math.min(MAP_SIZE - margin, position.y))
  };
}

export function getEnvironmentDimensions(isIndoor, indoorBounds = null) {
  if (isIndoor && indoorBounds) {
    return { width: indoorBounds.width, depth: indoorBounds.depth };
  }
  return { ...OUTDOOR_BOUNDS };
}

export function mapToSceneCoords(
  mapPosition,
  { isIndoor = false, indoorBounds = null, margin = 0 } = {}
) {
  if (!mapPosition) {
    return { x: 0, z: 0 };
  }

  const { width, depth } = getEnvironmentDimensions(isIndoor, indoorBounds);
  const normalizedX = mapPosition.x / MAP_SIZE - 0.5;
  const normalizedY = mapPosition.y / MAP_SIZE - 0.5;
  let x = normalizedX * width;
  let z = normalizedY * depth;

  if (isIndoor && indoorBounds) {
    const halfWidth = indoorBounds.width / 2 - margin;
    const halfDepth = indoorBounds.depth / 2 - margin;
    x = Math.max(-halfWidth, Math.min(halfWidth, x));
    z = Math.max(-halfDepth, Math.min(halfDepth, z));
  }

  return { x, z };
}

export function sceneToMapCoords(
  coords,
  { isIndoor = false, indoorBounds = null, margin = 5 } = {}
) {
  if (!coords) {
    return { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
  }

  const { width, depth } = getEnvironmentDimensions(isIndoor, indoorBounds);
  const normalizedX = coords.x / width + 0.5;
  const normalizedY = coords.z / depth + 0.5;

  return clampMapPosition({
    x: normalizedX * MAP_SIZE,
    y: normalizedY * MAP_SIZE
  }, margin);
}

export function mapDistanceToMeters(
  p1,
  p2,
  { isIndoor = false, indoorBounds = null } = {}
) {
  const a = mapToSceneCoords(p1, { isIndoor, indoorBounds });
  const b = mapToSceneCoords(p2, { isIndoor, indoorBounds });
  return Math.hypot(b.x - a.x, b.z - a.z);
}
