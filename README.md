# Watertijdreis

Source code for the [Watertijdreis](https://watertijdreis.nl/) application.

This project uses:

- [SvelteKit](https://svelte.dev/tutorial/kit/introducing-sveltekit) javascript framework;
- [MapLibre](https://maplibre.org/) mapping library;
- [Allmaps Maplibre plugin](https://allmaps.org/docs/packages/maplibre/) to render maps directly from their IIIF endpoints;
- [Protomaps](https://protomaps.com/) background map;
- [Geocode Earth](https://geocode.earth/) geocoder.

## Source data

The source data exists of [IIIF Manifests](https://iiif.io/api/presentation/3.0/) and [Georeference Annotations](https://iiif.io/api/extension/georef/). These are generated in the repository [watertijdreis-data](https://github.com/tu-delft-heritage/watertijdreis-data) and can be accessed through the following endpoint:

- [https://tu-delft-heritage.github.io/watertijdreis-data/collection.json](https://tu-delft-heritage.github.io/watertijdreis-data/collection.json)

For the map overview and timeline thumbnails, image sprites are used which can be found in the `static/sprites` directory. They have been generated using the scripts in [this repository](https://github.com/allmaps/sprite-test).

## Developing

Make sure to have a recent version of Node installed (^24) and install `pnpm` with [Corepack](https://pnpm.io/installation#using-corepack) by running `corepack enable pnpm`.

You can then run the application locally by executing the following commands:

```bash
# Install dependencies
pnpm i
# Run the development server
pnpm run dev
```

The console may throw errors related to the missing Geocoder Earth and Protomaps keys. In order to add those keys, create a `.env` file in the root of the repository with the following contents:

```env
PUBLIC_GEOCODE_EARTH_API_KEY=add-key-here
PUBLIC_PROTOMAPS_KEY=add-key-here
```

## Building

To create a production version of the app, run:

```bash
pnpm run build
```

The `main` and `dev` branches of the application are automatically deployed using [Render](https://render.com/):

| Branch | Deployment                                            |
| ------ | ----------------------------------------------------- |
| `main` | [watertijdreis.nl](https://watertijdreis.nl/)         |
| `dev`  | [dev.watertijdreis.nl](https://dev.watertijdreis.nl/) |
