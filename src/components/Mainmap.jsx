import React, { Component } from "react";

import { Map, View, Overlay } from "ol";
import {
	ScaleLine,
	OverviewMap,
	FullScreen,
	ZoomSlider,
	Zoom,
	defaults as defaultControls
} from "ol/control";
import MousePosition from "ol/control/MousePosition";
import { createStringXY } from "ol/coordinate";
import {
	defaults as defaultInteractions,
	DragRotateAndZoom,
	Select,
	DragAndDrop
} from "ol/interaction";
import { OSM, Vector as VectorSource } from "ol/source";
import { Tile, Vector as VectorLayer } from "ol/layer";
import { GeoJSON, TopoJSON, KML } from "ol/format";
import OSMXML from "ol/format/OSMXML";

// import Cesium from "cesium/Cesium";
// import OLCesium from "olcs/OLCesium.js";

import Layertree from "./Layertree";
import Toolbar, { Interaction, Measure } from "./Toolbar";

import { connect } from "react-redux";
import { updateMap } from "../redux/actions/map-actions";
import { updateLayertree } from "../redux/actions/layertree-actions";
import { updateToolbar } from "../redux/actions/toolbar-actions";

import { data } from "../assets/res/world_countries";

// window.Cesium = Cesium;

VectorLayer.prototype.buildHeaders = function() {
	const oldHeaders = this.get("headers") || {};
	const headers = {};
	const features = this.getSource().getFeatures();
	for (var i = 0; i < features.length; i += 1) {
		const attributes = features[i].getProperties();
		for (var j in attributes) {
			if (typeof attributes[j] !== "object" && !(j in oldHeaders)) {
				headers[j] = "string";
			} else if (j in oldHeaders) {
				headers[j] = oldHeaders[j];
			}
		}
	}
	this.set("headers", headers);
	return this;
};

export class Mainmap extends Component {
	componentDidMount() {
		// fetch("../assets/res/world_countries.geojson").then(data =>
		// 	console.log("data:", data)
		// );
		// .then(json => console.log("json", json));

		const view = new View({
			projection: "EPSG:4326",
			center: [0, 0],
			zoom: 4
		});

		const vectorLayer = new VectorLayer({
			source: new VectorSource({
				features: new GeoJSON().readFeatures(data)
			}),
			name: "World Countries",
			headers: {
				pop_est: "integer",
				gdp_md_est: "integer"
			}
		});

		const dragAndDrop = new DragAndDrop({
			formatConstructors: [GeoJSON, TopoJSON, KML, OSMXML]
		});

		dragAndDrop.on("addfeatures", function(evt) {
			const source = new VectorSource();
			const layer = new VectorLayer({
				source: source,
				name: "Drag&Drop Layer"
			});
			layertree.addBufferIcon(layer);
			map.addLayer(layer);
			source.addFeatures(evt.features);
		});

		const map = new Map({
			interactions: defaultInteractions().extend([
				dragAndDrop,
				new DragRotateAndZoom(),
				new Select({ layers: [vectorLayer] })
			]),
			controls: defaultControls().extend([
				new ScaleLine(),
				new ZoomSlider(),
				new OverviewMap({
					className: "ol-overviewmap ol-custom-overviewmap",
					layers: [
						new Tile({
							name: "OSM",
							title: "Open Street Map",
							source: new OSM()
						})
					],
					collapsible: false,
					view: new View({
						projection: "EPSG:4326",
						center: [18.6, -34.0],
						zoom: 7
					})
				}),
				new MousePosition({
					coordinateFormat: createStringXY(4),
					projection: "EPSG:4326",
					target: "coordinates"
				})
			]),
			layers: [
				new Tile({
					name: "Open Street Map",
					source: new OSM()
				}),
				vectorLayer
			],
			loadTilesWhileAnimating: true,
			view: view,
			target: "map"
		});

		const layertree = new Layertree({
			map: map,
			target: "layertree",
			messages: "messageBar"
		})
			.createRegistry(map.getLayers().item(0))
			.createRegistry(map.getLayers().item(1));

		const toolbar = new Toolbar({
			map: map,
			target: "toolbar",
			layertree: layertree
		})
			.addControl(new Zoom())
			.addControl(new FullScreen())
			.addControl(
				new Interaction({
					interaction: new Select()
				})
			)
			.addSelectControls()
			.addEditingToolBar();

		map
			.getLayers()
			.item(1)
			.getSource()
			.on("change", function(evt) {
				if (this.getState() === "ready") {
					map
						.getLayers()
						.item(1)
						.buildHeaders();
				}
			});

		var measureControl = new Interaction({
			label: " ",
			tipLabel: "Measure distances and areas",
			className: "ol-measure ol-unselectable ol-control",
			interaction: new Measure({
				map: map
			})
		});
		console.log(measureControl);
		measureControl.get("interaction").on("change:result", function(evt) {
			const result = evt.target.get("result");
			Layertree.messages.textContent = result.measurement + " " + result.unit;
		});

		Toolbar.addControl(measureControl);

		const flyTo = (location, done) => {
			let duration = 2000;
			let zoom = view.getZoom();
			let parts = 2;
			let called = false;
			function callback(complete) {
				--parts;
				if (called) {
					return;
				}
				if (parts === 0 || !complete) {
					called = true;
					done(complete);
				}
			}
			view.animate(
				{
					center: location,
					duration: duration
				},
				callback
			);
			view.animate(
				{
					zoom: zoom - 1,
					duration: duration / 2
				},
				{
					zoom: zoom,
					duration: duration / 2
				},
				callback
			);
		};

		// onClick("fly-to-bern", function() {
		// 	flyTo(bern, function() {});
		// });

		// const ol3d = new OLCesium({ map: map });
		// ol3d.setEnabled(true);

		// map.on("click", function(evt) {
		// 	const pixel = evt.pixel;
		// 	const coord = evt.coordinate;
		// 	const attributeForm = document.createElement("form");
		// 	attributeForm.className = "popup";
		// 	this.getOverlays().clear();

		// 	let firstFeature = true;

		// 	function createRow(attributeName, attributeValue, type) {
		// 		const rowElem = document.createElement("div");
		// 		const attributeSpan = document.createElement("span");
		// 		attributeSpan.textContent = attributeName + ": ";
		// 		rowElem.appendChild(attributeSpan);
		// 		const attributeInput = document.createElement("input");
		// 		attributeInput.name = attributeName;
		// 		attributeInput.type = "text";
		// 		if (type !== "string") {
		// 			attributeInput.type = "number";
		// 			attributeInput.step = type === "float" ? 1e-6 : 1;
		// 		}
		// 		attributeInput.value = attributeValue;
		// 		rowElem.appendChild(attributeInput);
		// 		return rowElem;
		// 	}

		// 	this.forEachFeatureAtPixel(
		// 		pixel,
		// 		(feature, layer) => {
		// 			console.log("Feature: ", feature);
		// 			console.log("Layer: ", layer);
		// 			if (firstFeature) {
		// 				const attributes = feature.getProperties();
		// 				const headers = layer.get("headers");
		// 				for (var i in attributes) {
		// 					if (typeof attributes[i] !== "object" && i in headers) {
		// 						attributeForm.appendChild(
		// 							createRow(i, attributes[i], headers[i])
		// 						);
		// 					}
		// 				}
		// 				if (attributeForm.children.length > 0) {
		// 					const saveAttributes = document.createElement("input");
		// 					saveAttributes.type = "submit";
		// 					saveAttributes.className = "save";
		// 					saveAttributes.value = "";
		// 					attributeForm.addEventListener("submit", function(evt) {
		// 						evt.preventDefault();
		// 						let attributeList = {};
		// 						let inputList = [].slice.call(
		// 							this.querySelectorAll("input[type=text], input[type=number]")
		// 						);
		// 						for (var i = 0; i < inputList.length; i += 1) {
		// 							switch (headers[inputList[i].name]) {
		// 								case "string":
		// 									attributeList[inputList[i].name] = inputList[
		// 										i
		// 									].value.toString();
		// 									break;
		// 								case "integer":
		// 									attributeList[inputList[i].name] = parseInt(
		// 										inputList[i].value
		// 									);
		// 									break;
		// 								case "float":
		// 									attributeList[inputList[i].name] = parseFloat(
		// 										inputList[i].value
		// 									);
		// 									break;
		// 								default:
		// 									attributeList[inputList[i].name] = inputList[i].value;
		// 									break;
		// 							}
		// 						}
		// 						feature.setProperties(attributeList);
		// 						map.getOverlays().clear();
		// 					});
		// 					attributeForm.appendChild(saveAttributes);
		// 					this.addOverlay(
		// 						new Overlay({
		// 							element: attributeForm,
		// 							position: coord
		// 						})
		// 					);
		// 					firstFeature = false;
		// 				}
		// 			}
		// 		},
		// 		map,
		// 		function(layerCandidate) {
		// 			if (
		// 				this.selectedLayer !== null &&
		// 				layerCandidate.get("id") === this.selectedLayer.id
		// 			) {
		// 				return true;
		// 			}
		// 			return false;
		// 		},
		// 		layertree
		// 	);
		// });

		this.props.onUpdateMap(map);
		this.props.onUpdateTree(layertree);
		this.props.onUpdateToolbar(toolbar);
	}

	render() {
		return (
			<div>
				<div id="toolbar" className="toolbar" />
				<div id="layertree" className="layertree" />
				<div id="map" className="map">
					{/* <div className="nosupport">
						Map hasn't loaded, ensure that your browser supports this
						functionality.
					</div> */}
				</div>
			</div>
		);
	}
}

const mapActionsToProps = {
	onUpdateMap: updateMap,
	onUpdateTree: updateLayertree,
	onUpdateToolbar: updateToolbar
};

export default connect(
	null,
	mapActionsToProps
)(Mainmap);
