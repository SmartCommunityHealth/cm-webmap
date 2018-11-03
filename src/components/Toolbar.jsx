//@ts-check

import { Component } from "react";

import { Collection, Map, inherits, Observable, Feature } from "ol";
import { Vector as VectorLayer } from "ol/layer";
import { Control } from "ol/control";
import { Vector as VectorSource } from "ol/source";
import { Select, DragBox, Draw, Modify, Snap, Pointer } from "ol/interaction";
import { Style, Circle, Fill, Stroke } from "ol/style";
import { Point, Polygon, LineString } from "ol/geom";

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
		.addControl(snapFeature)
		.addControl(removeFeature)
		.addControl(dragFeature);
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
	Pointer.call(this, {
		handleDownEvent: function(evt) {
			this.set(
				"deleteCandidate",
				evt.map.forEachFeatureAtPixel(
					evt.pixel,
					(feature, layer) => {
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
			var deltaX = evt.coordinate[0] - this.get("coords")[0];
			var deltaY = evt.coordinate[1] - this.get("coords")[1];
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

export default Toolbar;
