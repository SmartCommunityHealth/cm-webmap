import React from "react";
import ReactDOM from "react-dom";
import "./styles/index.css";
import App from "./components/App";
import * as serviceWorker from "./serviceWorker";

import { combineReducers, createStore } from "redux";
import { Provider } from "react-redux";

import layertreeReducer from "./redux/reducers/layertreeReducer";
import toolbarReducer from "./redux/reducers/toolbarReducer";
import mapReducer from "./redux/reducers/mapReducer";

const allReducers = combineReducers({
	treeTarget: toolbarReducer,
	layertree: layertreeReducer,
	map: mapReducer
});

const store = createStore(allReducers);

ReactDOM.render(
	<Provider store={store}>
		<App />
	</Provider>,
	document.getElementById("root")
);

serviceWorker.unregister();
