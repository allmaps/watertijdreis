export interface SpriteData {
	imageId: string;
	allmapsId: string;
	scaleFactor: number;
	x: number;
	y: number;
	width: number;
	height: number;
	spriteTileScale: number;
}


export class SpriteSheet {
	loading = $state(false);
	error = $state<string | null>(null);
	
	private spriteMap = new Map<string, SpriteData>();
	private blobCache = new Map<string, string>();
	private sourceImage: HTMLImageElement | null = null;
	private canvas: HTMLCanvasElement | null = null;

	constructor(
		private jsonUrl: string = './sprites/regular-sheets-128.json',
		private imageUrl: string = './sprites/regular-sheets-128.jpg'
	) {}

	async init(): Promise<void> {
		this.loading = true;
		this.error = null;

		try {
			const response = await fetch(this.jsonUrl);
			if (!response.ok) throw new Error(`Failed to load JSON: ${response.statusText}`);
			const data: SpriteData[] = await response.json();

			for (const item of data) {
				this.spriteMap.set(item.allmapsId, item);
			}

			await this.loadImage(this.imageUrl);
			
			if (typeof document !== 'undefined') {
				this.canvas = document.createElement('canvas');
			}

		} catch (err) {
			console.error('SpriteSheetManager Error:', err);
			this.error = err instanceof Error ? err.message : String(err);
		} finally {
			this.loading = false;
		}
	}

	private loadImage(url: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'Anonymous';
			img.src = url;
			img.onload = () => {
				this.sourceImage = img;
				resolve();
			};
			img.onerror = (e) => reject(`Failed to load sprite image: ${url}`);
		});
	}

	async getThumbnailUrl(id: string): Promise<string | null> {
		if (this.blobCache.has(id)) {
			return this.blobCache.get(id)!;
		}

		const data = this.spriteMap.get(id);
		if (!data || !this.sourceImage || !this.canvas) {
			console.warn(`Sprite not ready or ID not found: ${id}`);
			return null;
		}

		const ctx = this.canvas.getContext('2d');
		if (!ctx) return null;

		this.canvas.width = data.width;
		this.canvas.height = data.height;

		ctx.drawImage(
			this.sourceImage,
			data.x,
			data.y,     
			data.width, 
			data.height,
			0,              
			0,              
			data.width, 
			data.height 
		);

		return new Promise((resolve) => {
			this.canvas!.toBlob((blob) => {
				if (blob) {
					const url = URL.createObjectURL(blob);
					this.blobCache.set(id, url);
					resolve(url);
				} else {
					resolve(null);
				}
			}, 'image/jpeg');
		});
	}

	async prepareAllSprites() {
		if (!this.sourceImage) await this.init();
		
		const promises = [];
		for (const id of this.spriteMap.keys()) {
			promises.push(this.getThumbnailUrl(id));
		}
		await Promise.all(promises);
		console.log(`Prepared ${this.blobCache.size} sprites.`);
	}

    destroy() {
        for (const url of this.blobCache.values()) {
            URL.revokeObjectURL(url);
        }
        this.blobCache.clear();
        this.sourceImage = null;
    }
}