import React, { Component } from "react";

import "ol/ol.css";
import "../styles/App.css";

import MainMap from "./Mainmap";
import NotificationBar from "./NotificationBar";
import AddLayersForms from "./AddLayersForms";

class App extends Component {
	render() {
		return (
			<div className="map-container">
				<MainMap />
				<NotificationBar />
				<AddLayersForms />
			</div>
		);
	}
}

export default App;
