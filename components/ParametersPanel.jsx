import { Sliders } from 'lucide-react';

export default function ParametersPanel({ parameters, onParameterChange, presets, onPresetSelect }) {
  const handleChange = (param, value) => {
    onParameterChange(param, parseFloat(value));
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Sliders className="text-purple-400" />
        Flight Parameters
      </h2>

      {/* Presets */}
      <div className="mb-6">
        <label className="text-sm text-purple-300 mb-2 block">Drone Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onPresetSelect(preset)}
              className="py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-purple-200 text-sm transition-all"
            >
              {preset.icon} {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Parameter Sliders */}
      <div className="space-y-4">
        {/* Max Speed */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-purple-300">Max Speed</label>
            <span className="text-sm text-white font-semibold">{parameters.maxSpeed} m/s</span>
          </div>
          <input
            type="range"
            min="10"
            max="50"
            step="1"
            value={parameters.maxSpeed}
            onChange={(e) => handleChange('maxSpeed', e.target.value)}
            className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Battery Capacity */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-purple-300">Battery Capacity</label>
            <span className="text-sm text-white font-semibold">{parameters.batteryCapacity} mAh</span>
          </div>
          <input
            type="range"
            min="2000"
            max="10000"
            step="500"
            value={parameters.batteryCapacity}
            onChange={(e) => handleChange('batteryCapacity', e.target.value)}
            className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Motor Power */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-purple-300">Motor Power</label>
            <span className="text-sm text-white font-semibold">{parameters.motorPower}W</span>
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={parameters.motorPower}
            onChange={(e) => handleChange('motorPower', e.target.value)}
            className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Wind Strength */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-purple-300">Wind Strength</label>
            <span className="text-sm text-white font-semibold">{parameters.windStrength} m/s</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={parameters.windStrength}
            onChange={(e) => handleChange('windStrength', e.target.value)}
            className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* GPS Accuracy */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-purple-300">GPS Accuracy</label>
            <span className="text-sm text-white font-semibold">±{parameters.gpsAccuracy}m</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={parameters.gpsAccuracy}
            onChange={(e) => handleChange('gpsAccuracy', e.target.value)}
            className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Signal Range */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-purple-300">Signal Range</label>
            <span className="text-sm text-white font-semibold">{parameters.signalRange}m</span>
          </div>
          <input
            type="range"
            min="100"
            max="2000"
            step="50"
            value={parameters.signalRange}
            onChange={(e) => handleChange('signalRange', e.target.value)}
            className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Payload Weight */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-purple-300">Payload Weight</label>
            <span className="text-sm text-white font-semibold">{parameters.payloadWeight}kg</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={parameters.payloadWeight}
            onChange={(e) => handleChange('payloadWeight', e.target.value)}
            className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Max Altitude */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-purple-300">Max Altitude</label>
            <span className="text-sm text-white font-semibold">{parameters.maxAltitude}m</span>
          </div>
          <input
            type="range"
            min="50"
            max="400"
            step="10"
            value={parameters.maxAltitude}
            onChange={(e) => handleChange('maxAltitude', e.target.value)}
            className="w-full h-2 bg-purple-900/50 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-300 leading-relaxed">
          💡 Adjust parameters in real-time to see their effects on flight performance, battery consumption, and control responsiveness.
        </p>
      </div>
    </div>
  );
}
