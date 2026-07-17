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