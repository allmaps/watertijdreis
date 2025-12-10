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

export interface SpriteSheetSource {
	jsonUrl: string;
	imageUrl: string;
}

type MappedSprite = SpriteData & { sourceImageUrl: string };

export class SpriteSheet {
	loading = $state(false);
	error = $state<string | null>(null);

	private sprites = new Map<string, MappedSprite>();

	private initialized = false;

	constructor(private sources: SpriteSheetSource[]) { }

	async init() {
		if (this.initialized) return;

		this.loading = true;
		this.error = null;

		try {
			const responses = await Promise.all(
				this.sources.map(src => fetch(src.jsonUrl))
			);

			for (const r of responses) {
				if (!r.ok) throw new Error(`HTTP Error: ${r.status}`);
			}

			const jsonArrays: SpriteData[][] = await Promise.all(
				responses.map(r => r.json())
			);

			jsonArrays.forEach((sprites, index) => {
				const sourceImageUrl = this.sources[index].imageUrl;

				for (const sprite of sprites) {
					this.sprites.set(sprite.allmapsId, {
						...sprite,
						sourceImageUrl
					});
				}
			});

			this.initialized = true;

		} catch (err) {
			console.error("SpriteSheet laadfout:", err);
			this.error = err instanceof Error ? err.message : String(err);
		} finally {
			this.loading = false;
		}
	}

	getSprite(id: string): MappedSprite | undefined {
		return this.sprites.get(id);
	}
}

const sources: SpriteSheetSource[] = [
	{
		jsonUrl: './sprites/regular-sheets-128.json',
		imageUrl: './sprites/regular-sheets-128.jpg'
	},
	{
		jsonUrl: './sprites/special-sheets-128.json',
		imageUrl: './sprites/special-sheets-128.jpg'
	}
];

export const spriteStore = new SpriteSheet(sources);