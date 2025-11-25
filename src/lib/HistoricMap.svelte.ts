export class HistoricMap {
	mapViewer: MapViewer;
	id: string;
	bis: boolean;
	edition: number;
	number: number;
	position: string;
	x: number;
	y: number;
	yearStart: number;
	yearEnd: number;

	get warpedMap(): WarpedMap | undefined {
		return this.mapViewer.warpedMapLayer?.getWarpedMap(this.id);
	}

	get thumbnailUrl(): string | undefined {
		console.log('getting thumbnail url', this);
		if (this.warpedMap?.georeferencedMap)
			return this.warpedMap?.georeferencedMap.resource.id + '/full/32,/0/default.jpg';
	}

	get imageUrl(): string | undefined {
		console.log('getting image url', this);
		// TODO: not hardcoded
		if (this.warpedMap?.georeferencedMap)
			return this.warpedMap?.georeferencedMap.resource.id + '/full/128,/0/default.jpg';
	}

	constructor(mapViewer: MapViewer, id: string, meta: any) {
		this.mapViewer = mapViewer;
		this.id = id;
		this.bis = meta.bis;
		this.edition = meta.edition;
		this.number = meta.number;
		this.position = meta.position;
		this.x = meta.x;
		this.y = meta.y;
		this.yearStart = meta.yearStart;
		this.yearEnd = meta.yearEnd;
	}
}
