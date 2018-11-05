import React, { Component } from "react";

import { View, inherits, Observable } from "ol";
import { Control } from "ol/control";
import * as proj from "ol/proj";
import { Tile, Vector, Group } from "ol/layer";

export class NotificationBar extends Component {
	render() {
		return (
			<div className="notification-bar">
				<div id="messageBar" className="message-bar" />
				<div id="projection" />
				<div id="rotation" />
				<div id="coordinates" />
			</div>
		);
	}
}

export const RotationControl = function(opt_options) {
	const options = opt_options || {};
	const _this = this;
	const controlInput = document.createElement("input");
	controlInput.title = options.tipLabel || "Set rotation";
	controlInput.type = "number";
	controlInput.min = 0;
	controlInput.max = 360;
	controlInput.step = 1;
	controlInput.value = 0;
	controlInput.addEventListener("change", function(evt) {
		const radianValue = (this.value / 180) * Math.PI;
		_this
			.getMap()
			.getView()
			.setRotation(radianValue);
	});
	Control.call(this, {
		element: controlInput,
		target: options.target
	});
	this.set("element", controlInput);
};
inherits(RotationControl, Control);

RotationControl.prototype.setMap = function(map) {
	Control.prototype.setMap.call(this, map);
	if (map === null) {
		Observable.unByKey(this.get("eventId"));
	} else {
		this.set(
			"eventId",
			map.getView().on(
				"change:rotation",
				evt => {
					const degreeValue = Math.round(
						(map.getView().getRotation() / Math.PI) * 180
					);
					this.get("element").value = degreeValue;
				},
				this
			)
		);
	}
};

export const Projection = function(opt_options) {
	const options = opt_options || {};
	const _this = this;
	const projSwitcher = document.createElement("select");
	const webMercator = document.createElement("option");
	webMercator.value = "EPSG:3857";
	webMercator.textContent = "EPSG:3857";
	projSwitcher.appendChild(webMercator);
	const plateCarree = document.createElement("option");
	plateCarree.value = "EPSG:4326";
	plateCarree.textContent = "EPSG:4326";
	projSwitcher.appendChild(plateCarree);
	projSwitcher.addEventListener("change", function(evt) {
		const view = _this.getMap().getView();
		const oldProj = view.getProjection();
		const newProj = proj.get(this.value);
		const newView = new View({
			center: proj.transform(view.getCenter(), oldProj, newProj),
			zoom: view.getZoom(),
			projection: newProj,
			extent: newProj.getExtent()
		});
		_this.getMap().setView(newView);
		_this
			.getMap()
			.getLayers()
			.forEach(function(layer) {
				_this.changeLayerProjection(layer, oldProj, newProj);
			});
	});
	Control.call(this, {
		element: projSwitcher,
		target: options.target
	});
	this.set("element", projSwitcher);
};
inherits(Projection, Control);

Projection.prototype.setMap = function(map) {
	Control.prototype.setMap.call(this, map);
	if (map !== null) {
		this.get("element").value = map
			.getView()
			.getProjection()
			.getCode();
	}
};

Projection.prototype.changeLayerProjection = function(layer, oldProj, newProj) {
	if (layer instanceof Group) {
		layer.getLayers().forEach(function(subLayer) {
			this.changeLayerProjection(subLayer, oldProj, newProj);
		});
	} else if (layer instanceof Tile) {
		const tileLoadFunc = layer.getSource().getTileLoadFunction();
		layer.getSource().setTileLoadFunction(tileLoadFunc);
	} else if (layer instanceof Vector) {
		const features = layer.getSource().getFeatures();
		for (var i = 0; i < features.length; i += 1) {
			features[i].getGeometry().transform(oldProj, newProj);
		}
	}
};

Projection.prototype.addProjection = function(projection) {
	proj.addProjection(projection);
	var projSwitcher = this.get("element");
	var newProjOption = document.createElement("option");
	newProjOption.value = projection.getCode();
	newProjOption.textContent = projection.getCode();
	projSwitcher.appendChild(newProjOption);
};

export default NotificationBar;
