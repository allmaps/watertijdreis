export function getUserLocation(): Promise<{ lat: number; lng: number }> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Geolocation is not supported by your browser."));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				resolve({ lat: latitude, lng: longitude });
			},
			(error) => {
				reject(error);
			},
			{
				enableHighAccuracy: false,
				timeout: 15000,
				maximumAge: 10000
			}
		);
	});
}

export function isInNL(lat, lng) {
	const NL_BBOX = {
		minLat: 50.5,
		maxLat: 53.7,
		minLng: 3.0,
		maxLng: 7.5
	};

	return (
		lat >= NL_BBOX.minLat &&
		lat <= NL_BBOX.maxLat &&
		lng >= NL_BBOX.minLng &&
		lng <= NL_BBOX.maxLng
	);
}