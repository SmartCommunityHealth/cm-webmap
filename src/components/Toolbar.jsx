import { Component } from "react";

import {
	Collection,
	Map,
	inherits,
	Observable,
	Feature,
	Overlay,
	View
} from "ol";
import { Vector as VectorLayer } from "ol/layer";
import { Control, ZoomToExtent } from "ol/control";
import { Vector as VectorSource } from "ol/source";
import {
	Select,
	DragBox,
	Draw,
	Modify,
	Snap,
	Pointer
	/*Interaction as intInteraction*/
} from "ol/interaction";
import { Style, Circle, Fill, Stroke } from "ol/style";
import { Point, Polygon, LineString } from "ol/geom";
import SimpleGeometry from "ol/geom/SimpleGeometry";
import { linear, easeIn } from "ol/easing";
import { GeoJSON } from "ol/format";
import turf from "turf";

export class Toolbar extends Component {
	"use strict";
	constructor(props) {
		super(props);

		if (!(this instanceof Toolbar)) {
			throw new Error("Toolbar must be constructed with the new keyword.");
		} else if (
			typeof this.props === "object" &&
			this.props.map &&
			this.props.target &&
			this.props.layertree
		) {
			if (!(this.props.map instanceof Map)) {
				throw new Error("Please provide a valid OpenLayers map object.");
			}
			this.map = this.props.map;
			this.toolbar = document.getElementById(this.props.target);
			this.layertree = this.props.layertree;
			this.controls = new Collection();
		} else {
			throw new Error("Invalid parameter(s) provided.");
		}
	}
}

Toolbar.prototype.addControl = function(control) {
	if (!(control instanceof Control)) {
		throw new Error("Only controls can be added to the toolbar.");
	}

	// if it's a toggle control then toggle off all other toggle controls when this one is toggled on
	if (control.get("type") === "toggle") {
		control.on(
			"change:active",
			() => {
				if (control.get("active")) {
					this.controls.forEach(function(controlToDisable) {
						if (
							controlToDisable.get("type") === "toggle" &&
							controlToDisable !== control
						) {
							controlToDisable.set("active", false);
						}
					});
				}
			},
			this
		);
	}

	// add control to the toolbar, the controls array and the map
	control.setTarget(this.toolbar);
	this.controls.push(control);
	this.map.addControl(control);
	return this;
};

Toolbar.prototype.removeControl = function(control) {
	this.controls.remove(control);
	this.map.removeControl(control);
	return this;
};

export const Interaction = function(opt_options) {
	const options = opt_options || {};

	//create the toolbar div and create the button
	const controlDiv = document.createElement("div");
	controlDiv.className = options.className || "ol-unselectable ol-control";
	const controlButton = document.createElement("button");
	controlButton.textContent = options.label || "I";
	controlButton.title = options.tipLabel || "Custom interaction";
	controlDiv.appendChild(controlButton);

	this.setDisabled = function(bool) {
		if (typeof bool === "boolean") {
			controlButton.disabled = bool;
			return this;
		}
	};

	//toggle the active status of the button when clicked
	controlButton.addEventListener("click", () => {
		if (this.get("interaction").getActive()) {
			this.set("active", false);
		} else {
			this.set("active", true);
		}
	});
	const interaction = options.interaction;

	// extend the ol control constructor with the new interaction and set its properties
	Control.call(this, {
		element: controlDiv,
		target: options.target
	});
	this.setProperties({
		interaction: interaction,
		active: false,
		type: "toggle",
		destroyFunction: evt => {
			if (evt.element === this) {
				this.removeInteraction(this.get("interaction"));
			}
		}
	});

	// If the control is activated, activate the interaction and add the active class to its class list
	this.on(
		"change:active",
		function() {
			this.get("interaction").setActive(this.get("active"));
			if (this.get("active")) {
				controlButton.classList.add("active");
			} else {
				controlButton.classList.remove("active");
			}
		},
		this
	);
};
inherits(Interaction, Control);

Interaction.prototype.setMap = function(map) {
	Control.prototype.setMap.call(this, map);
	const interaction = this.get("interaction");
	if (map === null) {
		Observable.unByKey(this.get("eventId"));
	} else if (
		map
			.getInteractions()
			.getArray()
			.indexOf(interaction) === -1
	) {
		map.addInteraction(interaction);
		interaction.setActive(false);
		this.set(
			"eventId",
			map.getControls().on("remove", this.get("destroyFunction"), map)
		);
	}
};

Toolbar.prototype.addInfoControl = function() {
	const layertree = this.layertree;
	const map = this.map;

	const selectInteraction = new Select({
		layers: function(layer) {
			if (layertree.selectedLayer) {
				if (layer === layertree.getLayerById(layertree.selectedLayer.id)) {
					return true;
				}
			}
			return false;
		}
	});

	const info = new Interaction({
		label: "i",
		tipLabel: "Info",
		className: "ol-singleselect ol-unselectable ol-control",
		interaction: selectInteraction
	}).setDisabled(true);

	layertree.selectEventEmitter.on(
		"change",
		() => {
			const layer = layertree.getLayerById(layertree.selectedLayer.id);
			if (layer instanceof VectorLayer) {
				info.setDisabled(false);
				// const infoActive = info.get("active");

				map.on("click", function(evt) {
					const pixel = evt.pixel;
					const coord = evt.coordinate;
					const attributeForm = document.createElement("form");
					attributeForm.className = "popup";
					this.getOverlays().clear();

					let firstFeature = true;

					function createRow(attributeName, attributeValue /*, type*/) {
						const rowElem = document.createElement("div");
						const attributeSpan = document.createElement("span");
						attributeSpan.textContent = attributeName + ": ";
						rowElem.appendChild(attributeSpan);
						const attributeInput = document.createElement("input");
						attributeInput.disabled = true;
						attributeInput.className = "form-control form-control-sm";
						attributeInput.name = attributeName;
						attributeInput.type = "text";
						// if (type !== "string") {
						// 	attributeInput.type = "number";
						// 	attributeInput.step = type === "float" ? 1e-6 : 1;
						// }
						attributeInput.value = attributeValue;
						rowElem.appendChild(attributeInput);
						return rowElem;
					}

					this.forEachFeatureAtPixel(
						pixel,
						(feature, layer) => {
							if (firstFeature) {
								const attributes = feature.getProperties();
								// const headers = layer.get("headers");
								for (var i in attributes) {
									if (typeof attributes[i] !== "object" /*&& i in headers*/) {
										attributeForm.appendChild(
											createRow(i, attributes[i] /*, headers[i] */)
										);
									}
								}
								if (attributeForm.children.length > 0) {
									// const saveAttributes = document.createElement("input");
									// saveAttributes.type = "submit";
									// saveAttributes.className = "save";
									// saveAttributes.value = "";
									// attributeForm.addEventListener("submit", function(evt) {
									// 	evt.preventDefault();
									// 	let attributeList = {};
									// 	let inputList = [].slice.call(this.querySelectorAll("input"));
									// 	for (var i = 0; i < inputList.length; i += 1) {
									// 		switch (headers[inputList[i].name]) {
									// 			case "string":
									// 				attributeList[inputList[i].name] = inputList[
									// 					i
									// 				].value.toString();
									// 				break;
									// 			case "integer":
									// 				attributeList[inputList[i].name] = parseInt(
									// 					inputList[i].value
									// 				);
									// 				break;
									// 			case "float":
									// 				attributeList[inputList[i].name] = parseFloat(
									// 					inputList[i].value
									// 				);
									// 				break;
									// 			default:
									// 				attributeList[inputList[i].name] = inputList[i].value;
									// 				break;
									// 		}
									// 	}
									// 	feature.setProperties(attributeList);
									// 	map.getOverlays().clear();
									// });
									// attributeForm.appendChild(saveAttributes);
									this.addOverlay(
										new Overlay({
											element: attributeForm,
											position: coord
										})
									);
									firstFeature = false;
								}
							}
						},
						map,
						function(layerCandidate) {
							if (
								this.selectedLayer !== null &&
								layerCandidate.get("id") === this.selectedLayer.id
							) {
								return true;
							}
							return false;
						},
						layertree
					);
				});

				const _this = this;
				setTimeout(function() {
					_this.activeFeatures.clear();
				}, 0);
			} else {
				info.setDisabled(true);
			}
		},
		this
	);

	this.addControl(info);

	return this;
};

Toolbar.prototype.addSelectControls = function() {
	const layertree = this.layertree;
	const selectInteraction = new Select({
		layers: function(layer) {
			if (layertree.selectedLayer) {
				if (layer === layertree.getLayerById(layertree.selectedLayer.id)) {
					return true;
				}
			}
			return false;
		}
	});
	const selectSingle = new Interaction({
		label: " ",
		tipLabel: "Select feature",
		className: "ol-singleselect ol-unselectable ol-control",
		interaction: selectInteraction
	});
	const boxInteraction = new DragBox();
	var selectMulti = new Interaction({
		label: " ",
		tipLabel: "Select features with a box",
		className: "ol-multiselect ol-unselectable ol-control",
		interaction: boxInteraction
	});
	boxInteraction.on(
		"boxend",
		evt => {
			selectInteraction.getFeatures().clear();
			const extent = boxInteraction.getGeometry().getExtent();
			if (this.layertree.selectedLayer) {
				const source = this.layertree
					.getLayerById(this.layertree.selectedLayer.id)
					.getSource();
				if (source instanceof VectorSource) {
					source.forEachFeatureIntersectingExtent(extent, function(feature) {
						selectInteraction.getFeatures().push(feature);
					});
				}
			}
		},
		this
	);
	const controlDiv = document.createElement("div");
	controlDiv.className = "ol-deselect ol-unselectable ol-control";
	const controlButton = document.createElement("button");
	controlButton.title = "Remove selection(s)";
	controlDiv.appendChild(controlButton);
	controlButton.addEventListener("click", function() {
		selectInteraction.getFeatures().clear();
	});
	const deselectControl = new Control({
		element: controlDiv
	});
	this.addControl(selectSingle)
		.addControl(selectMulti)
		.addControl(deselectControl);
	return this;
};

Toolbar.prototype.addEditingToolBar = function() {
	const layertree = this.layertree;
	this.editingControls = new Collection();
	const drawPoint = new Interaction({
		label: " ",
		tipLabel: "Add points",
		className: "ol-addpoint ol-unselectable ol-control",
		interaction: this.handleEvents(
			new Draw({
				type: "Point",
				snapTolerance: 1
			}),
			"point"
		)
	}).setDisabled(true);
	this.editingControls.push(drawPoint);

	const drawLine = new Interaction({
		label: " ",
		tipLabel: "Add lines",
		className: "ol-addline ol-unselectable ol-control",
		interaction: this.handleEvents(
			new Draw({
				type: "LineString",
				snapTolerance: 1
			}),
			"line"
		)
	}).setDisabled(true);
	this.editingControls.push(drawLine);

	const drawPolygon = new Interaction({
		label: " ",
		tipLabel: "Add polygons",
		className: "ol-addpolygon ol-unselectable ol-control",
		interaction: this.handleEvents(
			new Draw({
				type: "Polygon",
				snapTolerance: 1
			}),
			"polygon"
		)
	}).setDisabled(true);
	this.editingControls.push(drawPolygon);

	const removeFeature = new Interaction({
		label: " ",
		tipLabel: "Remove features",
		className: "ol-removefeat ol-unselectable ol-control",
		interaction: new RemoveFeature({
			features: this.activeFeatures
		})
	}).setDisabled(true);
	this.editingControls.push(removeFeature);

	const dragFeature = new Interaction({
		label: " ",
		tipLabel: "Drag features",
		className: "ol-dragfeat ol-unselectable ol-control",
		interaction: new DragFeature({
			features: this.activeFeatures
		})
	}).setDisabled(true);
	this.editingControls.push(dragFeature);

	//adding the snap and modify controls to the toolbar
	this.activeFeatures = new Collection();
	const modifyFeature = new Interaction({
		label: " ",
		tipLabel: "Modify features",
		className: "ol-modifyfeat ol-unselectable ol-control",
		interaction: new Modify({
			features: this.activeFeatures
		})
	}).setDisabled(true);
	this.editingControls.push(modifyFeature);

	const snapFeature = new Interaction({
		label: " ",
		tipLabel: "Snap to paths, and vertices",
		className: "ol-snap ol-unselectable ol-control",
		interaction: new Snap({
			features: this.activeFeatures
		})
	}).setDisabled(true);
	snapFeature.unset("type");
	this.editingControls.push(snapFeature);

	layertree.selectEventEmitter.on(
		"change",
		() => {
			const layer = layertree.getLayerById(layertree.selectedLayer.id);
			if (layer instanceof VectorLayer) {
				this.editingControls.forEach(function(control) {
					control.setDisabled(false);
				});
				const layerType = layer.get("type");
				if (layerType !== "point" && layerType !== "geomcollection")
					drawPoint.setDisabled(true).set("active", false);
				if (layerType !== "line" && layerType !== "geomcollection")
					drawLine.setDisabled(true).set("active", false);
				if (layerType !== "polygon" && layerType !== "geomcollection")
					drawPolygon.setDisabled(true).set("active", false);
				const _this = this;
				setTimeout(function() {
					_this.activeFeatures.clear();
					_this.activeFeatures.extend(layer.getSource().getFeatures());
				}, 0);
			} else {
				this.editingControls.forEach(function(control) {
					control.set("active", false);
					control.setDisabled(true);
				});
			}
		},
		this
	);
	this.addControl(drawPoint)
		.addControl(drawLine)
		.addControl(drawPolygon)
		.addControl(modifyFeature)
		.addControl(snapFeature);
	// .addControl(removeFeature)
	// .addControl(dragFeature);
	return this;
};

Toolbar.prototype.handleEvents = function(interaction, type) {
	if (type !== "point") {
		interaction.on(
			"drawstart",
			evt => {
				let error = false;
				if (this.layertree.selectedLayer) {
					const selectedLayer = this.layertree.getLayerById(
						this.layertree.selectedLayer.id
					);
					const layerType = selectedLayer.get("type");
					error =
						layerType !== type && layerType !== "geomcollection" ? true : false;
				} else {
					error = true;
				}
				if (error) {
					interaction.finishDrawing();
				}
			},
			this
		);
	}
	interaction.on(
		"drawend",
		evt => {
			let error = "";
			if (this.layertree.selectedLayer) {
				const selectedLayer = this.layertree.getLayerById(
					this.layertree.selectedLayer.id
				);
				error =
					selectedLayer instanceof VectorLayer
						? ""
						: "Please select a valid vector layer.";
				if (error) {
					return;
				}
				const layerType = selectedLayer.get("type");
				error =
					layerType === type || layerType === "geomcollection"
						? ""
						: "Selected layer has a different vector type.";
			} else {
				error = "Please select a layer first.";
			}
			if (!error) {
				const selectedLayer = this.layertree.getLayerById(
					this.layertree.selectedLayer.id
				);
				selectedLayer.getSource().addFeature(evt.feature);
				this.activeFeatures.push(evt.feature);
			} else {
				this.layertree.messages.textContent = error;
			}
		},
		this
	);
	return interaction;
};

export const RemoveFeature = function(opt_options) {
	console.log("this_out: ", this);
	Pointer.call(this, {
		handleDownEvent: function(evt) {
			console.log("this_in: ", this);
			this.set(
				"deleteCandidate",
				evt.map.forEachFeatureAtPixel(
					evt.pixel,
					(feature, layer) => {
						console.log("this_in_in: ", this);
						if (
							this.get("features")
								.getArray()
								.indexOf(feature) !== -1
						) {
							return feature;
						}
					},
					this
				)
			);
			return !!this.get("deleteCandidate");
		},
		handleUpEvent: function(evt) {
			evt.map.forEachFeatureAtPixel(
				evt.pixel,
				function(feature, layer) {
					if (feature === this.get("deleteCandidate")) {
						layer.getSource().removeFeature(feature);
						this.get("features").remove(feature);
					}
				},
				this
			);
			this.set("deleteCandidate", null);
		}
	});
	this.setProperties({
		features: opt_options.features,
		deleteCandidate: null
	});
};
inherits(RemoveFeature, Pointer);

export const DragFeature = function(opt_options) {
	Pointer.call(this, {
		handleDownEvent: function(evt) {
			this.set(
				"draggedFeature",
				evt.map.forEachFeatureAtPixel(
					evt.pixel,
					function(feature, layer) {
						if (
							this.get("features")
								.getArray()
								.indexOf(feature) !== -1
						) {
							return feature;
						}
					},
					this
				)
			);
			if (this.get("draggedFeature")) {
				this.set("coords", evt.coordinate);
			}
			return !!this.get("draggedFeature");
		},
		handleDragEvent: function(evt) {
			let deltaX = evt.coordinate[0] - this.get("coords")[0];
			let deltaY = evt.coordinate[1] - this.get("coords")[1];
			this.get("draggedFeature")
				.getGeometry()
				.translate(deltaX, deltaY);
			this.set("coords", evt.coordinate);
		},
		handleUpEvent: function(evt) {
			this.setProperties({
				coords: null,
				draggedFeature: null
			});
		}
	});
	this.setProperties({
		features: opt_options.features,
		coords: null,
		draggedFeature: null
	});
};
inherits(DragFeature, Pointer);

export const Measure = opt_options => {
	const options = opt_options || {};
	if (!(options.map instanceof Map)) {
		throw new Error("Please provide a valid OpenLayers map");
	}
	const style =
		opt_options.style ||
		new Style({
			image: new Circle({
				radius: 6,
				fill: new Fill({
					color: [0, 153, 255, 1]
				}),
				stroke: new Stroke({
					color: [255, 255, 255, 1],
					width: 1.5
				})
			}),
			stroke: new Stroke({
				color: [0, 153, 255, 1],
				width: 3
			}),
			fill: new Fill({
				color: [255, 255, 255, 0.5]
			})
		});
	const cursorFeature = new Feature();
	const lineFeature = new Feature();
	const polygonFeature = new Feature();
	Interaction.call(this, {
		handleEvent: function(evt) {
			switch (evt.type) {
				case "pointermove":
					cursorFeature.setGeometry(new Point(evt.coordinate));
					const coordinates = this.get("coordinates");
					coordinates[coordinates.length - 1] = evt.coordinate;
					if (this.get("session") === "area") {
						if (coordinates.length < 3) {
							lineFeature.getGeometry().setCoordinates(coordinates);
						} else {
							polygonFeature.getGeometry().setCoordinates([coordinates]);
						}
					} else if (this.get("session") === "length") {
						lineFeature.getGeometry().setCoordinates(coordinates);
					}
					break;
				case "click":
					if (!this.get("session")) {
						if (evt.originalEvent.shiftKey) {
							this.set("session", "area");
							polygonFeature.setGeometry(new Polygon([[[0, 0]]]));
						} else {
							this.set("session", "length");
						}
						lineFeature.setGeometry(new LineString([[0, 0]]));
						this.set("coordinates", [evt.coordinate]);
					}
					this.get("coordinates").push(evt.coordinate);
					return false;
				case "dblclick":
					let unit;
					if (this.get("session") === "area") {
						let area = polygonFeature.getGeometry().getArea();
						if (area > 1000000) {
							area = area / 1000000;
							unit = "km²";
						} else {
							unit = "m²";
						}
						this.set("result", {
							type: "area",
							measurement: area,
							unit: unit
						});
					} else {
						let length = lineFeature.getGeometry().getLength();
						if (length > 1000) {
							length = length / 1000;
							unit = "km";
						} else {
							unit = "m";
						}
						this.set("result", {
							type: "length",
							measurement: length,
							unit: unit
						});
					}
					cursorFeature.setGeometry(null);
					lineFeature.setGeometry(null);
					polygonFeature.setGeometry(null);
					this.setProperties({
						session: null,
						coordinates: []
					});
					return false;
				default:
					break;
			}
			return true;
		}
	});
	this.on("change:active", function(evt) {
		if (this.getActive()) {
			this.get("overlay").setMap(this.get("map"));
		} else {
			this.get("overlay").setMap(null);
			this.set("session", null);
			lineFeature.setGeometry(null);
			polygonFeature.setGeometry(null);
		}
	});
	this.setProperties({
		overlay: new VectorLayer({
			source: new VectorSource({
				features: [cursorFeature, lineFeature, polygonFeature]
			}),
			style: style
		}),
		map: options.map,
		session: null,
		coordinates: [],
		result: null
	});
};
inherits(Measure, Interaction);

export const NavigationHistory = function(opt_options) {
	const options = opt_options || {};
	const _this = this;
	const controlDiv = document.createElement("div");
	controlDiv.className = options.class || "ol-unselectable ol-control";
	const backButton = document.createElement("button");
	backButton.className = "ol-navhist-back";
	backButton.textContent = options.backButtonText || "◀";
	backButton.title = options.backButtonTipLabel || "Previous view";
	backButton.addEventListener("click", function(evt) {
		const historyArray = _this.get("history");
		let currIndex = _this.get("index");
		if (currIndex > 0) {
			currIndex -= 1;
			_this.setProperties({
				shouldSave: false,
				index: currIndex
			});
			_this
				.getMap()
				.getView()
				.setProperties(historyArray[currIndex]);
		}
	});
	backButton.disabled = true;
	controlDiv.appendChild(backButton);

	const nextButton = document.createElement("button");
	nextButton.className = "ol-navhist-next";
	nextButton.textContent = options.nextButtonText || "►";
	nextButton.title = options.nextButtonTipLabel || "Next view";
	nextButton.addEventListener("click", function(evt) {
		const historyArray = _this.get("history");
		let currIndex = _this.get("index");
		if (currIndex < historyArray.length - 1) {
			currIndex += 1;
			_this.setProperties({
				shouldSave: false,
				index: currIndex
			});
			_this
				.getMap()
				.getView()
				.setProperties(historyArray[currIndex]);
		}
	});
	nextButton.disabled = true;
	controlDiv.appendChild(nextButton);
	Control.call(this, {
		element: controlDiv,
		target: options.target
	});
	this.setProperties({
		history: [],
		index: -1,
		maxSize: options.maxSize || 50,
		eventId: null,
		shouldSave: true
	});
	this.on("change:index", function() {
		if (this.get("index") === 0) {
			backButton.disabled = true;
		} else {
			backButton.disabled = false;
		}
		if (this.get("history").length - 1 === this.get("index")) {
			nextButton.disabled = true;
		} else {
			nextButton.disabled = false;
		}
	});
};
inherits(NavigationHistory, Control);

NavigationHistory.prototype.setMap = function(map) {
	Control.prototype.setMap.call(this, map);
	if (map === null) {
		Observable.unByKey(this.get("eventId"));
	} else {
		this.set(
			"eventId",
			map.on(
				"moveend",
				function(evt) {
					if (this.get("shouldSave")) {
						const view = map.getView();
						const viewStatus = {
							center: view.getCenter(),
							resolution: view.getResolution(),
							rotation: view.getRotation()
						};
						const historyArray = this.get("history");
						let currIndex = this.get("index");
						historyArray.splice(
							currIndex + 1,
							historyArray.length - currIndex - 1
						);
						if (historyArray.length === this.get("maxSize")) {
							historyArray.splice(0, 1);
						} else {
							currIndex += 1;
						}
						historyArray.push(viewStatus);
						this.set("index", currIndex);
					} else {
						this.set("shouldSave", true);
					}
				},
				this
			)
		);
	}
};

export const ZoomTo = function(opt_options) {
	const options = opt_options || {};
	const _this = this;
	const controlDiv = document.createElement("div");
	controlDiv.className = options.class || "ol-unselectable ol-control";
	const controlButton = document.createElement("button");
	controlButton.textContent = options.label || "";
	controlButton.title = options.tipLabel || "Zoom to extent";
	controlButton.addEventListener("click", function(evt) {
		const zoomCandidate = _this.get("extentFunction")();
		if (
			zoomCandidate instanceof SimpleGeometry ||
			(Object.prototype.toString.call(zoomCandidate) === "[object Array]" &&
				zoomCandidate.length === 4)
		) {
			_this
				.getMap()
				.getView()
				.fit(zoomCandidate, _this.getMap().getSize());
		}
	});
	controlDiv.appendChild(controlButton);
	Control.call(this, {
		element: controlDiv,
		target: options.target
	});
	this.set("extentFunction", options.zoomFunction);
};
inherits(ZoomTo, Control);

Toolbar.prototype.addExtentControls = function() {
	const zoomFull = new ZoomToExtent({
		label: " ",
		tipLabel: "Zoom to full extent"
	});

	let ztle = [];
	this.layertree.selectEventEmitter.on("change", () => {
		const layer = this.layertree.getLayerById(this.layertree.selectedLayer.id);

		if (layer.getSource().getExtent()) {
			ztle = layer.getSource().getExtent();
		}
	});

	const zoomToLayer = new ZoomToExtent({
		class: "ol-zoom-layer ol-unselectable ol-control",
		tipLabel: "Zoom to layer extent",
		extent: ztle
	});

	let ztse = [];
	if (this.selectInteraction) {
		const features = this.selectInteraction.getFeatures();
		if (features.getLength() === 1) {
			const geom = features.item(0).getGeometry();
			if (geom instanceof SimpleGeometry) {
				return geom;
			}
			ztse = geom.getExtent();
			console.log("ztse: ", ztse);
		}
	}

	const zoomToSelected = new ZoomToExtent({
		class: "ol-zoom-selected ol-unselectable ol-control",
		tipLabel: "Zoom to selected feature",
		extent: ztse
	});

	this.addControl(zoomFull)
		.addControl(zoomToLayer)
		.addControl(zoomToSelected);

	return this;
};

export const RocketFlight = function() {
	const _this = this;
	const controlDiv = document.createElement("div");
	controlDiv.className = "ol-rocket ol-unselectable ol-control";
	const controlButton = document.createElement("button");
	controlButton.title = "Launch me";
	controlButton.addEventListener("click", function() {
		const view = _this.getMap().getView();
		_this.getMap().beforeRender(
			rocketTakeoff({
				resolution: view.getResolution(),
				rotation: view.getRotation()
			})
		);
		view.setResolution(39135.75848201024);
		setTimeout(function() {
			_this.getMap().beforeRender(
				View.animate.pan({
					duration: 2000,
					source: view.getCenter(),
					easing: linear
				}),
				rocketLanding({
					resolution: view.getResolution(),
					rotation: view.getRotation()
				})
			);
			view.setProperties({
				center: [2026883.0676951527, 5792745.55306364],
				resolution: 0.5971642834779395
			});
		}, 5100);
	});
	controlDiv.appendChild(controlButton);
	Control.call(this, {
		element: controlDiv
	});
};
inherits(RocketFlight, Control);

const rocketTakeoff = function(options) {
	const now = +new Date();
	return function(map, frameState) {
		if (frameState.time < now + 5000) {
			let delta = 1 - easeIn((frameState.time - now) / 5000);
			let deltaResolution =
				options.resolution - frameState.viewState.resolution;
			frameState.animate = true;
			frameState.viewState.resolution += delta * deltaResolution;
			if (frameState.time > now + 2000 && frameState.time < now + 3000) {
				let rotateDelta = linear((frameState.time - now - 2000) / 1000);
				let deltaRotation = options.rotation - 0.5;
				frameState.viewState.rotation += deltaRotation * rotateDelta;
			} else if (
				frameState.time >= now + 3000 &&
				frameState.time < now + 4000
			) {
				let rotateDelta = 1 - linear((frameState.time - now - 3000) / 1000);
				let deltaRotation = options.rotation - 0.5;
				frameState.viewState.rotation += deltaRotation * rotateDelta;
			}
			frameState.viewHints[0] += 1;
			return true;
		}
		return false;
	};
};

const rocketLanding = function(options) {
	let now = +new Date();
	let direction = Math.round(Math.random());
	return function(map, frameState) {
		if (frameState.time < now + 15000) {
			let delta = 1 - parachute((frameState.time - now) / 15000);
			let deltaResolution =
				options.resolution - frameState.viewState.resolution;
			frameState.animate = true;
			frameState.viewState.resolution += delta * deltaResolution;
			if (frameState.time > now + 5000 && frameState.time < now + 7000) {
				let rotateDelta = linear((frameState.time - now - 5000) / 2000);
				let deltaRotation = options.rotation + 2 * Math.PI;
				frameState.viewState.rotation += deltaRotation * rotateDelta;
			} else if (
				frameState.time > now + 7000 &&
				frameState.time < now + 10000
			) {
				let panDelta = linear((frameState.time - now - 7000) / 3000);
				frameState.viewState.center[direction] += 500 * panDelta;
			} else if (
				frameState.time >= now + 10000 &&
				frameState.time < now + 12000
			) {
				let panDelta = 1 - linear((frameState.time - now - 10000) / 2000);
				frameState.viewState.center[direction] += 500 * panDelta;
			}
			frameState.viewHints[0] += 1;
			return true;
		}
		return false;
	};
};

const parachute = function(t) {
	return 1 - Math.pow(1 - t, 7);
};

export const Print = function(opt_options) {
	const options = opt_options || {};
	const _this = this;
	const controlDiv = document.createElement("div");
	controlDiv.className = options.class || "ol-print ol-unselectable ol-control";
	const controlButton = document.createElement("button");
	controlButton.textContent = options.label || "P";
	controlButton.title = options.tipLabel || "Print map";
	let dataURL;
	controlButton.addEventListener("click", function(evt) {
		_this.getMap().once("postcompose", function(evt) {
			const canvas = evt.context.canvas;
			dataURL = canvas.toDataURL("image/png");
		});
		_this.getMap().renderSync();
		window.open(dataURL, "_blank");
		dataURL = null;
	});
	controlDiv.appendChild(controlButton);
	Control.call(this, {
		element: controlDiv,
		target: options.target
	});
};
inherits(Print, Control);

export const Turf = function(opt_options) {
	const options = opt_options || {};
	const _this = this;
	const controlDiv = document.createElement("div");
	controlDiv.className = options.class || "ol-turf ol-unselectable ol-control";
	const bufferButton = document.createElement("button");
	bufferButton.textContent = "B";
	bufferButton.title = "Buffer selected layer";
	bufferButton.addEventListener("click", function(evt) {
		const layer = _this.getMap().get("selectedLayer");
		const units = _this
			.getMap()
			.getView()
			.getProjection()
			.getUnits();
		if (layer instanceof VectorLayer) {
			const parser = new GeoJSON();
			const geojson = parser.writeFeaturesObject(
				layer.getSource().getFeatures()
			);
			const buffered = turf.buffer(geojson, 10000, units);
			const bufferedLayer = new VectorLayer({
				source: new VectorSource({
					features: parser.readFeatures(buffered)
				}),
				name: "Buffer result"
			});
			_this.getMap().addLayer(bufferedLayer);
		}
	});
	controlDiv.appendChild(bufferButton);
	// controlDiv.appendChild(selfIntersectButton);
	Control.call(this, {
		element: controlDiv,
		target: options.target
	});

	const mergeButton = document.createElement("button");
	mergeButton.textContent = "M";
	mergeButton.title = "Merge selected layer";
	mergeButton.addEventListener("click", function(evt) {
		const layer = _this.getMap().get("selectedLayer");
		if (layer instanceof VectorLayer) {
			const parser = new GeoJSON();
			const geojson = parser.writeFeaturesObject(
				layer.getSource().getFeatures()
			);
			const merged = turf.combine(geojson);
			const mergedLayer = new VectorLayer({
				source: new VectorSource({
					features: parser.readFeatures(merged)
				}),
				name: "Merge result"
			});
			_this.getMap().addLayer(mergedLayer);
		}
	});
	controlDiv.appendChild(mergeButton);

	const selfIntersectButton = document.createElement("button");
	selfIntersectButton.textContent = "S";
	selfIntersectButton.title = "Check self intersections";
	selfIntersectButton.addEventListener("click", function(evt) {
		const layer = _this.getMap().get("selectedLayer");
		if (layer instanceof VectorLayer) {
			const parser = new GeoJSON();
			const selfIntersectLayer = new VectorLayer({
				source: new VectorSource(),
				name: "Self intersects"
			});
			_this.getMap().addLayer(selfIntersectLayer);
			const features = layer.getSource().getFeatures();
			for (var i = 0; i < features.length; i += 1) {
				const geojson = parser.writeFeatureObject(features[i]);
				if (geojson.geometry.type === "MultiPolygon") {
					for (var j = 0; j < geojson.geometry.coordinates.length; j += 1) {
						const selfIntersect = turf.kinks(
							turf.polygon(geojson.geometry.coordinates[j])
						);
						if (selfIntersect.intersections.features.length > 0) {
							selfIntersectLayer
								.getSource()
								.addFeatures(parser.readFeatures(selfIntersect.intersections));
						}
					}
				} else if (geojson.geometry.type === "Polygon") {
					const selfIntersect = turf.kinks(geojson);
					if (selfIntersect.intersections.features.length > 0) {
						selfIntersectLayer
							.getSource()
							.addFeatures(parser.readFeatures(selfIntersect.intersections));
					}
				}
			}
		}
	});
	controlDiv.appendChild(selfIntersectButton);
};
inherits(Turf, Control);

export default Toolbar;
