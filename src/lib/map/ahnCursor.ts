import type { Map as LibreMap, MapMouseEvent, Point } from "maplibre-gl";

/** App-only readout; sampling and caching remain in the portable AHN layer. */
export function attachAhnCursor(map: LibreMap, sample: (lng: number, lat: number) => number | null) {
	const container = map.getContainer(),
		canvas = map.getCanvas();
	const label = document.createElement("div");
	label.className = "ahn-cursor-height";
	label.setAttribute("role", "tooltip");
	label.hidden = true;
	Object.assign(label.style, {
		position: "absolute",
		pointerEvents: "none",
		zIndex: "10",
		left: "0",
		top: "0",
		padding: "5px 8px",
		borderRadius: "5px",
		color: "white",
		background: "var(--color-wtr-blue)",
		border: "1px solid #ffffff40",
		boxShadow: "0 2px 8px #0003",
		fontSize: "12px",
		lineHeight: "18px",
		whiteSpace: "nowrap",
		fontVariantNumeric: "tabular-nums",
	});
	container.append(label);
	const format = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	let point: Point | null = null;
	function refresh() {
		if (!point) return;
		const { lng, lat } = map.unproject(point);
		const height = sample(lng, lat);
		const text = height === null ? "Geen AHN-hoogte" : `≈ ${format.format(height)} m NAP`;
		if (label.textContent !== text) label.textContent = text;
		label.hidden = false;
		const { offsetWidth: width, offsetHeight: heightPx } = label;
		const x = point.x + 14 + width > container.clientWidth - 6 ? point.x - width - 14 : point.x + 14;
		const y = point.y + 14 + heightPx > container.clientHeight - 6 ? point.y - heightPx - 14 : point.y + 14;
		label.style.transform = `translate(${Math.max(6, x)}px, ${Math.max(6, y)}px)`;
	}
	function move(e: MapMouseEvent) {
		if (e.originalEvent.target !== canvas) {
			hide();
			return;
		}
		point = e.point;
		refresh();
	}
	function hide() {
		point = null;
		label.hidden = true;
	}
	map.on("mousemove", move);
	map.on("render", refresh);
	canvas.addEventListener("mouseleave", hide);
	window.addEventListener("blur", hide);
	return () => {
		map.off("mousemove", move);
		map.off("render", refresh);
		canvas.removeEventListener("mouseleave", hide);
		window.removeEventListener("blur", hide);
		label.remove();
	};
}
