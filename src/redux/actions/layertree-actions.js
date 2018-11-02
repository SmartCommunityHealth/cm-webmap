export const UPDATE_LAYERTREE = "layertree:updateLayertree";

export function updateLayertree(newLayertree) {
	return {
		type: UPDATE_LAYERTREE,
		payload: newLayertree
	};
}
