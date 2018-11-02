import { UPDATE_TOOLBAR } from "../actions/toolbar-actions";

export default function toolbarReducer(state = {}, { type, payload }) {
	switch (type) {
		case UPDATE_TOOLBAR:
			return payload;
		default:
			return state;
	}
}
