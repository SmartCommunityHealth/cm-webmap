import React, { Component } from "react";

import { Map, View, Collection } from "ol";
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
	DragAndDrop,
	Modify
} from "ol/interaction";
import { OSM, Vector as VectorSource, TileWMS, XYZ } from "ol/source";
import { Tile, Vector as VectorLayer } from "ol/layer";
import { GeoJSON, TopoJSON, KML } from "ol/format";
import OSMXML from "ol/format/OSMXML";
import olProjection from "ol/proj/Projection";
import { Point } from "ol/geom";
import proj4 from "proj4";
import { Style, Icon } from "ol/style";

// import Cesium from "cesium/Cesium";
// import OLCesium from "olcs/OLCesium.js";

import Layertree from "./Layertree";
import Toolbar, {
	RocketFlight,
	Print,
	Turf,
	Cesium /*, { Interaction, Measure, NavigationHistory } */
} from "./Toolbar";
import { RotationControl, Projection } from "./NotificationBar";

import { connect } from "react-redux";
import { updateMap } from "../redux/actions/map-actions";
import { updateLayertree } from "../redux/actions/layertree-actions";
import { updateToolbar } from "../redux/actions/toolbar-actions";

import { countriesdata } from "../assets/res/world_countries";
import { capitalsdata } from "../assets/res/world_capitals";

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
		const view = new View({
			projection: "EPSG:4326",
			center: [0, 0],
			zoom: 4
			// extent: Projection.getExtent()
		});

		const projControl = new Projection({
			target: "projection"
		});

		proj4.defs(
			"EPSG:3995",
			"+proj=stere +lat_0=90 +lat_ts=71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
		);
		const polarProj = new olProjection({
			code: "EPSG:3995",
			extent: [-12382000, -12382000, 12382000, 12382000],
			worldExtent: [-180, 60, 180, 90]
		});
		projControl.addProjection(polarProj);

		const countries = new VectorLayer({
			source: new VectorSource({
				features: new GeoJSON().readFeatures(countriesdata),
				wrapX: false
			}),
			updateWhileAnimating: true,
			updateWhileInteracting: true,
			name:
				"World Countries" /*,
			headers: {
				pop_est: "integer",
				gdp_md_est: "integer"
			}*/
		});
		const capitals = new VectorLayer({
			source: new VectorSource({
				features: new GeoJSON().readFeatures(capitalsdata),
				wrapX: false
			}),
			updateWhileAnimating: true,
			updateWhileInteracting: true,
			style: new Style({
				image: new Icon({
					anchor: [0.5, 46],
					anchorXUnits: "fraction",
					anchorYUnits: "pixels",
					src: "../assets/res/marker.png"
				})
			}),
			name:
				"World Capitals" /*,
			headers: {
				pop_est: "integer",
				gdp_md_est: "integer"
			}*/
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
				new DragRotateAndZoom()
			]),
			controls: defaultControls().extend([
				// new RocketFlight(),
				// new Cesium({
				// 	target: "toolbar"
				// }),
				new Print({
					target: "toolbar"
				}),
				projControl,
				new RotationControl({
					target: "rotation"
				}),
				new ScaleLine(),
				new ZoomSlider(),
				new OverviewMap({
					className: "ol-overviewmap ol-custom-overviewmap",
					layers: [
						new Tile({
							name: "OSM",
							title: "Open Street Map",
							source: new OSM({ wrapX: false })
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
				}),
				new Turf({
					target: "toolbar"
				})
			]),
			layers: [
				// new Tile({
				// 	preload: Infinity,
				// 	source: new XYZ({
				// 		url:
				// 			"https://{1-4}.base.maps.cit.api.here.com" +
				// 			"/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/256/png" +
				// 			"?app_id=YjdDTdj88GNyfakDOdHb&app_code=oGkX5PmOR795UlljwC7NCg",
				// 		attributions:
				// 			"Map Tiles &copy; " +
				// 			new Date().getFullYear() +
				// 			" " +
				// 			'<a href="http://developer.here.com">HERE</a>'
				// 	}),
				// 	type: "base",
				// 	title: "Normal Day",
				// 	name: "Here Maps - Normal Day",
				// 	description: "Here - Normal Day WTS Layer",
				// 	visible: false,
				// 	wrapX: false,
				// 	crossOrigin: "anonymous"
				// }),
				// new Tile({
				// 	source: new TileWMS({
				// 		url: "http://demo.opengeo.org/geoserver/wms",
				// 		params: {
				// 			layers: "ne_50m_land",
				// 			format: "image/png"
				// 		}
				// 	}),
				// 	name: "Natural Earth Land",
				// 	visible: false,
				// 	wrapX: false,
				// 	crossOrigin: "anonymous"
				// }),
				new Tile({
					name: "Open Street Map",
					source: new OSM(),
					visible: true,
					wrapX: false,
					crossOrigin: "anonymous"
				})
				// countries,
				// capitals
			],
			loadTilesWhileAnimating: true,
			loadTilesWhileInteracting: true,
			view: view,
			target: "map"
		});

		const layertree = new Layertree({
			map: map,
			target: "layertree",
			messages: "messageBar"
		}).createRegistry(map.getLayers().item(0));
		// .createRegistry(map.getLayers().item(1))
		// .createRegistry(map.getLayers().item(2))
		// .createRegistry(map.getLayers().item(3))
		// .createRegistry(map.getLayers().item(4));

		// map
		// 	.getLayers()
		// 	.item(3)
		// 	.getSource()
		// 	.once("change", function(evt) {
		// 		if (this.getState() === "ready") {
		// 			map.addInteraction(
		// 				new Modify({
		// 					features: new Collection(evt.target.getFeatures())
		// 				})
		// 			);
		// 		}
		// 	});

		const toolbar = new Toolbar({
			map: map,
			target: "toolbar",
			layertree: layertree
		})
			.addControl(new Zoom())
			.addControl(new FullScreen())
			.addInfoControl()
			.addSelectControls()
			.addEditingToolBar()
			.addExtentControls();
		// .addControl(new NavigationHistory());

		// map
		// 	.getLayers()
		// 	.item(1)
		// 	.getSource()
		// 	.on("change", function(evt) {
		// 		if (this.getState() === "ready") {
		// 			map
		// 				.getLayers()
		// 				.item(1)
		// 				.buildHeaders();
		// 		}
		// 	});

		map.getView().on("propertychange", function(evt) {
			const projExtent = this.getProjection().getExtent();
			if (projExtent) {
				const currentCenter = this.getCenter();
				const currentResolution = this.getResolution();
				const mapSize = map.getSize();
				const newExtent = [
					projExtent[0] + (currentResolution * mapSize[0]) / 2,
					projExtent[1] + (currentResolution * mapSize[1]) / 2,
					projExtent[2] - (currentResolution * mapSize[0]) / 2,
					projExtent[3] - (currentResolution * mapSize[1]) / 2
				];
				if (!new Point(currentCenter).intersectsExtent(newExtent)) {
					currentCenter[0] = Math.min(
						Math.max(currentCenter[0], newExtent[0]),
						newExtent[2]
					);
					currentCenter[1] = Math.min(
						Math.max(currentCenter[1], newExtent[1]),
						newExtent[3]
					);
					this.setCenter(currentCenter);
				}
			}
		});

		// var measureControl = new Interaction({
		// 	label: " ",
		// 	tipLabel: "Measure distances and areas",
		// 	className: "ol-measure ol-unselectable ol-control",
		// 	interaction: new Measure({
		// 		map: map
		// 	})
		// });
		// console.log(measureControl);
		// measureControl.get("interaction").on("change:result", function(evt) {
		// 	const result = evt.target.get("result");
		// 	Layertree.messages.textContent = result.measurement + " " + result.unit;
		// });

		// Toolbar.addControl(measureControl);

		// const flyTo = (location, done) => {
		// 	let duration = 2000;
		// 	let zoom = view.getZoom();
		// 	let parts = 2;
		// 	let called = false;
		// 	function callback(complete) {
		// 		--parts;
		// 		if (called) {
		// 			return;
		// 		}
		// 		if (parts === 0 || !complete) {
		// 			called = true;
		// 			done(complete);
		// 		}
		// 	}
		// 	view.animate(
		// 		{
		// 			center: location,
		// 			duration: duration
		// 		},
		// 		callback
		// 	);
		// 	view.animate(
		// 		{
		// 			zoom: zoom - 1,
		// 			duration: duration / 2
		// 		},
		// 		{
		// 			zoom: zoom,
		// 			duration: duration / 2
		// 		},
		// 		callback
		// 	);
		// };

		// onClick("fly-to-bern", function() {
		// 	flyTo(bern, function() {});
		// });

		// const ol3d = new OLCesium({ map: map });
		// ol3d.setEnabled(true);

		this.props.onUpdateMap(map);
		this.props.onUpdateTree(layertree);
		this.props.onUpdateToolbar(toolbar);
	}

	render() {
		return (
			<div>
				<div id="toolbar" className="toolbar" />
				<div id="layertree" className="layertree" />
				<div id="map" className="map" tabIndex="-1">
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
