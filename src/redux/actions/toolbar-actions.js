export const UPDATE_TOOLBAR = "toolbar:updateToolbar";

export function updateToolbar(newToolbar) {
	return {
		type: UPDATE_TOOLBAR,
		payload: newToolbar
	};
}
