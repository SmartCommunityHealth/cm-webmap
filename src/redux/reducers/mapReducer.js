import { UPDATE_MAP } from "../actions/map-actions";

export default function mapReducer(state = {}, { type, payload }) {
	switch (type) {
		case UPDATE_MAP:
			return payload;
		default:
			return state;
	}
}
