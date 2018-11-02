import { UPDATE_TREE } from "./layertree-actions";

export default function treeReducer(state = {}, { type, payload }) {
	switch (type) {
		case UPDATE_TREE:
			return payload;
		default:
			return state;
	}
}
