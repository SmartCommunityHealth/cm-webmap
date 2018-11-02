export const UPDATE_MAP = "map:updateMap";

export function updateMap(newMap) {
	return {
		type: UPDATE_MAP,
		payload: newMap
	};
}
