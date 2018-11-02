import { UPDATE_LAYERTREE } from "../actions/layertree-actions";

export default function layertreeReducer(state = {}, { type, payload }) {
	switch (type) {
		case UPDATE_LAYERTREE:
			return payload;
		default:
			return state;
	}
}
