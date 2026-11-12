import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { flushSync } from "svelte";
import { AhnMapLayer } from "$lib/map/AhnMapLayer.svelte";
import AhnLayerSettings from "./AhnLayerSettings.svelte";
import { palettes } from "$lib/map/dynamic-ahn/palettes";
import { heightStatistics } from "$lib/map/dynamic-ahn/statistics";

let layer: AhnMapLayer;
beforeEach(() => {
	layer = new AhnMapLayer({ id: "ahn", name: "AHN", themeColor: "#44a" });
	render(AhnLayerSettings, { layer });
});
afterEach(() => {
	cleanup();
	layer.destroy();
});
const lockButton = () => screen.getByRole("button", { name: /Kleurschaal (vastzetten|losmaken)/ });
const field = (name: string) => screen.getByRole("spinbutton", { name });
const enter = (name: string, value: string) => fireEvent.input(field(name), { target: { value } });
const apply = () => fireEvent.submit(screen.getByRole("button", { name: "Toepassen en vastzetten" }).closest("form")!);
async function expand() {
	const details = screen.getByText("Geavanceerde opties").closest("details")!;
	details.open = true;
	await fireEvent(details, new Event("toggle"));
}

it("shows the requested primary controls in order, with advanced controls collapsed and the new defaults", async () => {
	expect(layer.opacity).toBe(0.75);
	expect(layer.mappingMode).toBe("equalized");
	expect(layer.blendMode).toBe("multiply");
	expect(layer.stops).toEqual(palettes[0].stops);
	const primary = [
		screen.getByRole("slider", { name: "Zichtbaarheid" }),
		screen.getByRole("checkbox", { name: "Historische kaarten in grijstinten" }),
		screen.getByText("Kleurenpalet"),
		screen.getByRole("checkbox", { name: "Hoogte bij cursor" }),
		screen.getByRole("link", { name: "PDOK" }),
		screen.getByText("Geavanceerde opties"),
	];
	for (let i = 1; i < primary.length; i++)
		expect(primary[i - 1].compareDocumentPosition(primary[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
	expect(screen.queryByRole("button", { name: /Kleurschaal (vastzetten|losmaken)/ })).not.toBeInTheDocument();
	expect(screen.queryByRole("img", { name: "Hoogteverdeling in beeld" })).not.toBeInTheDocument();
	await fireEvent.input(primary[0], { target: { value: "0.5" } });
	expect(layer.opacity).toBe(0.5);
	await expand();
	expect(screen.getByRole("combobox", { name: "Schaalverdeling" })).toHaveValue("equalized");
	expect(screen.queryByRole("combobox", { name: "Uitschieters" })).not.toBeInTheDocument();
});

it("edits only the selected endpoint, validates before locking, and unlocks from the histogram lock icon", async () => {
	await expand();
	expect(lockButton()).toBeDisabled();
	expect(screen.getByRole("button", { name: "Laag aanpassen" })).toBeDisabled();
	flushSync(() => {
		layer.scale = { low: 0, center: 5, high: 10 };
	});
	await fireEvent.click(screen.getByRole("button", { name: "Laag aanpassen" }));
	expect(field("Laag (m NAP)")).toHaveFocus();
	for (const invalid of ["10", ""]) {
		await enter("Laag (m NAP)", invalid);
		await apply();
		expect(screen.getByRole("alert")).toBeVisible();
		expect(layer.scaleLocked).toBe(false);
	}
	await enter("Laag (m NAP)", "-2.25");
	await apply();
	expect(layer.scale).toEqual({ low: -2.25, center: 3.875, high: 10 });
	expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
	expect(layer.scaleLocked).toBe(true);
	expect(lockButton()).toHaveAttribute("aria-pressed", "true");
	expect(screen.getByRole("combobox", { name: "Schaalverdeling" })).toBeDisabled();
	await fireEvent.click(lockButton());
	expect(layer.scaleLocked).toBe(false);
});

it("keeps unfinished manual edits stable across incoming scales and restores the latest value on Escape", async () => {
	await expand();
	flushSync(() => {
		layer.scale = { low: -10, center: 0, high: 90 };
	});
	await fireEvent.click(screen.getByRole("button", { name: "Laag aanpassen" }));
	await enter("Laag (m NAP)", "-5");
	flushSync(() => {
		layer.scale = { low: -20, center: 10, high: 100 };
	});
	expect(field("Laag (m NAP)")).toHaveValue(-5);
	expect(screen.getByRole("button", { name: "Hoog aanpassen" })).toHaveTextContent("90");
	await fireEvent.keyDown(field("Laag (m NAP)"), { key: "Escape" });
	expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Hoog aanpassen" })).toHaveTextContent("100");
});

it("keeps the three keyboard range handles ordered and supports precise entry", async () => {
	flushSync(() => {
		layer.setScale({ low: -10, center: 0, high: 90 });
	});
	await expand();
	const low = screen.getByRole("slider", { name: "Lage hoogte" });
	const high = screen.getByRole("slider", { name: "Hoge hoogte" });
	await fireEvent.keyDown(low, { key: "ArrowRight" });
	expect(layer.scale!.low).toBeCloseTo(-9.9);
	await fireEvent.keyDown(high, { key: "Home" });
	expect(layer.scale!.high).toBeGreaterThan(layer.scale!.low);
	expect(layer.scale!.center).toBeGreaterThan(layer.scale!.low);
	await fireEvent.click(low);
	expect(field("Laag (m NAP)")).toHaveFocus();
});

it("applies and reverses transparent presets without changing locked heights or blending", async () => {
	const scale = { low: -5, center: 0, high: 20 };
	flushSync(() => {
		layer.setScale(scale);
		layer.blendMode = "screen";
	});
	const button = screen.getByRole("button", { name: "Koel–warm · 4 kleuren · transparant", hidden: true });
	button.closest("details")!.open = true;
	await fireEvent.click(button);
	const original = layer.stops;
	await fireEvent.click(screen.getByRole("button", { name: "Omkeren" }));
	expect(layer.stops[0].color).toBe(original.at(-1)!.color);
	expect(layer.stops.find((s) => s.position === 50)?.alpha).toBe(0);
	expect(layer.scale).toEqual(scale);
	expect(layer.scaleLocked).toBe(true);
	expect(layer.blendMode).toBe("screen");
});

it("simplifies outliers to one clipping setting for linear and mean, with no ineffective adaptive controls", async () => {
	await expand();
	const mapping = screen.getByRole("combobox", { name: "Schaalverdeling" });
	expect(screen.queryByRole("combobox", { name: "Uitschieters" })).not.toBeInTheDocument();
	await fireEvent.change(mapping, { target: { value: "mean" } });
	expect(layer.scaleMode).toBe("percentile");
	expect(layer.outlierPercentile).toBe(2);
	await fireEvent.change(screen.getByRole("combobox", { name: "Uitschieters" }), { target: { value: "5" } });
	expect(layer.scaleMode).toBe("percentile");
	expect(layer.outlierPercentile).toBe(5);
	await fireEvent.change(mapping, { target: { value: "linear" } });
	expect(screen.getByRole("combobox", { name: "Uitschieters" })).toHaveValue("2");
	await fireEvent.change(mapping, { target: { value: "equalized" } });
	expect(screen.queryByRole("combobox", { name: "Uitschieters" })).not.toBeInTheDocument();
	await fireEvent.change(mapping, { target: { value: "extremes" } });
	expect(layer.mappingMode).toBe("extremes");
	expect(screen.getByRole("option", { name: "Extremen benadrukken" })).toBeInTheDocument();
	expect(screen.queryByRole("combobox", { name: "Uitschieters" })).not.toBeInTheDocument();
	expect(screen.getByText(/blijven behouden om de uitersten zichtbaar/)).toBeInTheDocument();
	await fireEvent.change(mapping, { target: { value: "mean" } });
	expect(screen.getByRole("combobox", { name: "Uitschieters" })).toHaveValue("2");
});

it("rounds editable values to centimetres, places the input before the description, and edits the center", async () => {
	flushSync(() => layer.setScale({ low: -10.123456, center: 0.123456, high: 90.654321 }));
	await expand();
	await fireEvent.click(screen.getByRole("button", { name: "Laag aanpassen" }));
	expect(field("Laag (m NAP)")).toHaveValue(-10.12);
	expect(field("Laag (m NAP)")).toHaveAttribute("step", "0.01");
	const description = screen.getByText("Sleep de driehoekjes of klik op een hoogte om de schaal vast te zetten.");
	expect(field("Laag (m NAP)").compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	await fireEvent.click(screen.getByRole("button", { name: "Annuleren" }));
	const before = layer.scale!;
	await fireEvent.click(screen.getByRole("button", { name: "Midden aanpassen" }));
	expect(field("Midden (m NAP)")).toHaveValue(0.12);
	await enter("Midden (m NAP)", "100");
	await apply();
	expect(screen.getByRole("alert")).toHaveTextContent("laag < midden < hoog");
	await enter("Midden (m NAP)", "4.567");
	await apply();
	expect(layer.scale).toEqual({ ...before, center: 4.57 });
	const middle = screen.getByRole("slider", { name: "Middelste hoogte" });
	await fireEvent.keyDown(middle, { key: "ArrowRight" });
	expect(layer.scale!.center).toBeGreaterThan(4.57);
	expect([layer.scale!.low, layer.scale!.high]).toEqual([before.low, before.high]);
});

it("offers cursor height opt-in and lists normal blending first without changing the default", async () => {
	const cursor = screen.getByRole("checkbox", { name: "Hoogte bij cursor" });
	expect(cursor).not.toBeChecked();
	await fireEvent.click(cursor);
	expect(layer.showCursorHeight).toBe(true);
	await expand();
	const modes = screen.getByRole("combobox", { name: "Mengmodus" });
	expect(modes.querySelector("option")!.value).toBe("normal");
	expect(modes).toHaveValue("multiply");
});

it("keeps the editor and all scale representations synchronized when dragging from an open input", async () => {
	flushSync(() => layer.setScale({ low: -10, center: 0, high: 90 }));
	await expand();
	await fireEvent.click(screen.getByRole("button", { name: "Laag aanpassen" }));
	await enter("Laag (m NAP)", "-99");
	const low = screen.getByRole("slider", { name: "Lage hoogte" });
	const high = screen.getByRole("slider", { name: "Hoge hoogte" });
	const track = low.parentElement!;
	vi.spyOn(track, "getBoundingClientRect").mockReturnValue({ left: 0, width: 100 } as DOMRect);
	for (const handle of [low, high]) handle.setPointerCapture = vi.fn();
	const pointer = (handle: HTMLElement, type: string, x: number) =>
		fireEvent(handle, new MouseEvent(type, { bubbles: true, button: 0, clientX: x }));
	await pointer(low, "pointerdown", 0);
	expect(field("Laag (m NAP)")).toHaveValue(-99);
	await pointer(low, "pointermove", 20);
	expect(layer.scale).toEqual({ low: 10, center: 18, high: 90 });
	expect(field("Laag (m NAP)")).toHaveValue(10);
	expect(low).toHaveAttribute("aria-valuenow", "10");
	expect(low.style.left).toBe("20%");
	await pointer(low, "pointerup", 20);
	await fireEvent.click(low);
	expect(field("Laag (m NAP)")).toHaveValue(10);
	expect(low.style.left).toBe("20%");
	await pointer(high, "pointerdown", 100);
	await pointer(high, "pointermove", 80);
	expect(field("Hoog (m NAP)")).toHaveValue(70);
	expect(high.style.left).toBe("80%");
	await pointer(high, "pointerup", 80);
	await fireEvent.click(high);
	const dragged = layer.scale;
	await apply();
	expect(layer.scale).toEqual(dragged);
	expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
	expect(low.style.left).toBe("20%");
	expect(high.style.left).toBe("80%");
});

it("preserves the histogram axis after releasing either endpoint and reopening settings until unlocked", async () => {
	flushSync(() => {
		layer.scale = { low: -10, center: 0, high: 90 };
		layer.statistics = heightStatistics([-10, 0, 10, 90], 4, [-10, 90]);
	});
	await expand();
	const low = screen.getByRole("slider", { name: "Lage hoogte" });
	const high = screen.getByRole("slider", { name: "Hoge hoogte" });
	vi.spyOn(low.parentElement!, "getBoundingClientRect").mockReturnValue({ left: 0, width: 100 } as DOMRect);
	const histogram = screen.getByRole("img", { name: "Hoogteverdeling in beeld" });
	const bars = () => [...histogram.querySelectorAll(".bar")].map((bar) => bar.outerHTML);
	const originalBars = bars();
	async function drag(handle: HTMLElement, start: number, end: number) {
		handle.setPointerCapture = vi.fn();
		for (const [type, x] of [
			["pointerdown", start],
			["pointermove", end],
			["pointerup", end],
		] as const)
			await fireEvent(handle, new MouseEvent(type, { bubbles: true, button: 0, clientX: x }));
		await fireEvent(handle, new Event("lostpointercapture", { bubbles: true }));
		await fireEvent.click(handle);
	}
	await drag(low, 0, 20);
	expect(low.style.left).toBe("20%");
	expect(high.style.left).toBe("100%");
	expect(layer.scaleLocked).toBe(true);
	await drag(high, 100, 80);
	expect(low.style.left).toBe("20%");
	expect(high.style.left).toBe("80%");
	expect(bars()).toEqual(originalBars);
	expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
	flushSync(() => (layer.statistics = heightStatistics([-100, 0, 100], 3, [-100, 100])));
	expect(low.style.left).toBe("20%");
	expect(high.style.left).toBe("80%");
	cleanup();
	render(AhnLayerSettings, { layer });
	await expand();
	expect(screen.getByRole("slider", { name: "Lage hoogte" }).style.left).toBe("20%");
	expect(screen.getByRole("slider", { name: "Hoge hoogte" }).style.left).toBe("80%");
	await fireEvent.click(lockButton());
	expect(screen.getByRole("slider", { name: "Lage hoogte" }).style.left).toBe("0%");
	expect(screen.getByRole("slider", { name: "Hoge hoogte" }).style.left).toBe("100%");
	expect(layer.legendAxis).toBeNull();
});

it("updates an open numeric editor when adjusting a handle with the keyboard", async () => {
	flushSync(() => layer.setScale({ low: -10, center: 0, high: 90 }));
	await expand();
	await fireEvent.click(screen.getByRole("button", { name: "Midden aanpassen" }));
	const center = screen.getByRole("slider", { name: "Middelste hoogte" });
	await fireEvent.keyDown(center, { key: "ArrowRight" });
	expect(layer.scale!.center).toBe(0.1);
	expect(field("Midden (m NAP)")).toHaveValue(0.1);
	expect(center).toHaveAttribute("aria-valuenow", "0.1");
	await fireEvent.click(screen.getByRole("button", { name: "Annuleren" }));
	expect(layer.scale!.center).toBe(0.1); // Drag/key changes were already applied; discard only unfinished typing.
});

it("anchors both end handles during independently arriving statistics and animated scale updates", async () => {
	await expand();
	const low = screen.getByRole("slider", { name: "Lage hoogte" });
	const high = screen.getByRole("slider", { name: "Hoge hoogte" });
	const check = () => {
		expect(low.style.left).toBe("0%");
		expect(high.style.left).toBe("100%");
	};
	for (const [min, max] of [
		[-100, 100],
		[-200, 300],
		[0, 500],
	]) {
		flushSync(() => {
			layer.scale = { low: -2, center: 0, high: 20 };
			layer.statistics = heightStatistics([min, 0, max], 3, [min, max]);
		});
		check();
		flushSync(() => (layer.scale = { low: 5, center: 10, high: 30 }));
		check();
	}
	flushSync(() => layer.setScale({ low: -1, center: 0, high: 1 }));
	flushSync(() => (layer.statistics = heightStatistics([100, 200, 300], 3, [110, 290])));
	check();
	expect(lockButton()).toHaveAttribute("aria-pressed", "true");
});
