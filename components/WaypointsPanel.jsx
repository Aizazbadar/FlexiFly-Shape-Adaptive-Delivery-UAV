import React from 'react';
import { MapPin, Trash2 } from 'lucide-react';

export default function WaypointsPanel({
	waypoints = [],
	activeId = null,
	onSelect = () => {},
	onRemove = null,
	onClear = null
}) {
	const showClear = typeof onClear === 'function';
	const showRemove = typeof onRemove === 'function';

	return (
		<div className="bg-black/30 border border-purple-500/30 rounded-2xl p-4 text-white space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<MapPin size={16} className="text-purple-300" />
					<span className="font-semibold text-sm uppercase tracking-wide">Waypoints</span>
				</div>
				{showClear && (
					<button
						className="text-xs text-purple-200 hover:text-white disabled:opacity-30"
						onClick={onClear}
						disabled={!waypoints.length}
					>
						Clear
					</button>
				)}
			</div>

			{waypoints.length === 0 ? (
				<p className="text-purple-200 text-xs">No waypoints queued. Add one from the map or quick actions.</p>
			) : (
				<ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
					{waypoints.map((wp, index) => (
						<li
							key={wp.id ?? index}
							className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs border ${
								wp.id === activeId
									? 'border-purple-400 bg-purple-500/20'
									: 'border-white/10 bg-white/5 hover:bg-white/10'
							}`}
						>
							<button className="text-left flex-1" onClick={() => onSelect(wp)}>
								<div className="font-semibold text-white">Waypoint {index + 1}</div>
								<div className="text-purple-200">
									x: {wp.x?.toFixed?.(1) ?? wp.x}, y: {wp.y?.toFixed?.(1) ?? wp.y}
								</div>
							</button>
											{showRemove && (
												<button
													className="text-purple-200 hover:text-red-400 ml-2"
													onClick={() => onRemove(wp)}
													aria-label="Remove waypoint"
												>
													<Trash2 size={14} />
												</button>
											)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
