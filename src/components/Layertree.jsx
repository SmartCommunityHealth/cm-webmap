import { Component } from "react";

import { Map, Observable } from "ol";
import { bbox } from "ol/loadingstrategy";
import { Vector as VectorLayer, Tile, Image } from "ol/layer";
import { TileWMS, ImageWMS, Vector as VectorSource } from "ol/source";
import { WMSCapabilities, WFS, GeoJSON, TopoJSON, KML } from "ol/format";
import OSMXML from "ol/format/OSMXML";
import { Style, Stroke, Fill } from "ol/style";

import shpjs from "shpjs";

class Layertree extends Component {
	"use strict";
	constructor(props) {
		super(props);

		/* Construct the Layertree object and check that it is provided with a valid
		openlayers object and mounted on a valid target element. Throw er*/
		if (!(this instanceof Layertree)) {
			throw new Error("layerTree must be constructed with the new keyword.");
		} else if (typeof props === "object" && props.map && props.target) {
			if (!(props.map instanceof Map)) {
				throw new Error("Please provide a valid OpenLayers map object.");
			}
			this.map = props.map;
			const containerDiv = document.getElementById(props.target);
			if (containerDiv === null || containerDiv.nodeType !== 1) {
				throw new Error("Please provide a valid element id.");
			}

			/* Set the target for notification messages and set a time out for the 
			display of messages to be 10 seconds */
			this.messages =
				document.getElementById(props.messages) ||
				document.createElement("span");
			const observer = new MutationObserver(function(mutations) {
				if (mutations[0].target.textContent) {
					let oldText = mutations[0].target.textContent;
					const timeoutFunction = function() {
						if (oldText !== mutations[0].target.textContent) {
							oldText = mutations[0].target.textContent;
							setTimeout(timeoutFunction, 10000);
						} else {
							oldText = "";
							mutations[0].target.textContent = "";
						}
					};
					setTimeout(timeoutFunction, 10000);
				}
			});
			observer.observe(this.messages, { childList: true });

			/* Create the Layertree buttons div and add buttons to it */
			const controlDiv = document.createElement("div");
			controlDiv.className = "layertree-buttons";
			controlDiv.appendChild(
				this.createButton("addwms", "Add WMS Layer", "addlayer")
			);
			controlDiv.appendChild(
				this.createButton("addwfs", "Add WFS Layer", "addlayer")
			);
			containerDiv.appendChild(controlDiv);
			controlDiv.appendChild(
				this.createButton("newshp", "Add Shape Layer", "addlayer")
			);
			controlDiv.appendChild(
				this.createButton("addvector", "Add Vector Layer", "addlayer")
			);
			controlDiv.appendChild(
				this.createButton("deletelayer", "Remove Layer", "deletelayer")
			);
			containerDiv.appendChild(controlDiv);
			controlDiv.appendChild(
				this.createButton("newvector", "New Vector Layer", "addlayer")
			);

			/* Create the div that will contain the layers and add it to the
			Layertree component */
			this.layerContainer = document.createElement("div");
			this.layerContainer.className = "layercontainer";
			containerDiv.appendChild(this.layerContainer);

			let idCounter = 0;
			this.selectedLayer = null;
			this.selectEventEmitter = new Observable();

			/* Create a method for creating new layers on the Layertree component */
			this.createRegistry = (layer, buffer) => {
				// set the id of the new layer
				layer.set("id", "layer_" + idCounter);
				idCounter += 1;

				//create a new div for the layer element and give it a class, title and id
				//and add it to the layer container
				const layerDiv = document.createElement("div");
				layerDiv.className = buffer
					? "layer ol-unselectable buffering"
					: "layer ol-unselectable";
				layerDiv.title = layer.get("name") || "Unnamed Layer";
				layerDiv.id = layer.get("id");
				this.addSelectEvent(layerDiv);

				// handle the drag and drop events
				var _this = this;
				layerDiv.draggable = true;
				layerDiv.addEventListener("dragstart", function(evt) {
					evt.dataTransfer.effectAllowed = "move";
					evt.dataTransfer.setData("Text", this.id);
				});
				layerDiv.addEventListener("dragenter", function(evt) {
					this.classList.add("over");
				});
				layerDiv.addEventListener("dragleave", function(evt) {
					this.classList.remove("over");
				});
				layerDiv.addEventListener("dragover", function(evt) {
					evt.preventDefault();
					evt.dataTransfer.dropEffect = "move";
				});
				layerDiv.addEventListener("drop", function(evt) {
					evt.preventDefault();
					this.classList.remove("over");
					const sourceLayerDiv = document.getElementById(
						evt.dataTransfer.getData("Text")
					);
					if (sourceLayerDiv !== this) {
						_this.layerContainer.removeChild(sourceLayerDiv);
						_this.layerContainer.insertBefore(sourceLayerDiv, this);
						const htmlArray = [].slice.call(_this.layerContainer.children);
						const index =
							htmlArray.length - htmlArray.indexOf(sourceLayerDiv) - 1;
						const sourceLayer = _this.getLayerById(sourceLayerDiv.id);
						const layers = _this.map.getLayers().getArray();
						layers.splice(layers.indexOf(sourceLayer), 1);
						layers.splice(index, 0, sourceLayer);
						_this.map.render();
					}
				});

				//create the check box and handle selection and deselection
				const visibleBox = document.createElement("input");
				visibleBox.type = "checkbox";
				visibleBox.className = "visible";
				visibleBox.checked = layer.getVisible();
				visibleBox.addEventListener("change", function() {
					if (this.checked) {
						layer.setVisible(true);
					} else {
						layer.setVisible(false);
					}
				});
				layerDiv.appendChild(this.stopPropagationOnEvent(visibleBox, "click"));

				const layerSpan = document.createElement("span");
				const layerText = document.createElement("input");
				layerText.type = "text";
				layerText.hidden = true;
				layerSpan.textContent = layerDiv.title;

				//handle selecting a layer element and handle double clicking for editing
				layerDiv.appendChild(this.addSelectEvent(layerSpan, true));
				layerDiv.appendChild(this.stopPropagationOnEvent(layerText, "click"));
				layerSpan.addEventListener("dblclick", function() {
					this.hidden = true;
					layerText.defaultValue = layerDiv.title;
					layerText.hidden = false;
					layerDiv.classList.remove("ol-unselectable");
					layerText.focus();
					layerDiv.draggable = false;
				});
				layerText.addEventListener("blur", function() {
					if (!this.hidden) {
						finishLayerNameEdit(this);
					}
				});
				layerText.addEventListener("keyup", function(e) {
					if (!this.hidden && e.keyCode === 13) {
						finishLayerNameEdit(this);
					}
				});
				function finishLayerNameEdit(_this) {
					layer.set("name", _this.value);
					layerDiv.classList.add("ol-unselectable");
					layerDiv.title = _this.value;
					layerSpan.textContent = layerDiv.title;
					layerSpan.hidden = false;
					_this.hidden = true;
					layerSpan.scrollTo(0, 0);
					layerDiv.draggable = true;
				}

				//create the layer controls on the active layer
				const layerControls = document.createElement("div");
				this.addSelectEvent(layerControls, true);
				const opacityHandler = document.createElement("input");
				opacityHandler.type = "range";
				opacityHandler.min = 0;
				opacityHandler.max = 1;
				opacityHandler.step = 0.1;
				opacityHandler.value = layer.getOpacity();
				opacityHandler.addEventListener("input", function() {
					layer.setOpacity(this.value);
				});
				opacityHandler.addEventListener("change", function() {
					layer.setOpacity(this.value);
				});
				opacityHandler.addEventListener("mousedown", function() {
					layerDiv.draggable = false;
				});
				opacityHandler.addEventListener("mouseup", function() {
					layerDiv.draggable = true;
				});
				layerControls.appendChild(
					this.stopPropagationOnEvent(opacityHandler, "click")
				);
				layerDiv.appendChild(layerControls);

				// //styling options
				// if (layer instanceof VectorLayer) {
				// 	layerControls.appendChild(document.createElement("hr"));
				// 	const attributeOptions = document.createElement("select");
				// 	attributeOptions.className = "form-control";
				// 	layerControls.appendChild(
				// 		this.stopPropagationOnEvent(attributeOptions, "click")
				// 	);
				// 	layerControls.appendChild(document.createElement("br"));
				// 	const defaultStyle = this.createButton(
				// 		"stylelayer",
				// 		"Default",
				// 		"stylelayer",
				// 		layer
				// 	);
				// 	layerControls.appendChild(
				// 		this.stopPropagationOnEvent(defaultStyle, "click")
				// 	);
				// 	defaultStyle.className = "btn btn-primary btn-sm";
				// 	const graduatedStyle = this.createButton(
				// 		"stylelayer",
				// 		"Graduated",
				// 		"stylelayer",
				// 		layer
				// 	);
				// 	layerControls.appendChild(
				// 		this.stopPropagationOnEvent(graduatedStyle, "click")
				// 	);
				// 	graduatedStyle.className = "btn btn-primary btn-sm";
				// 	const categorizedStyle = this.createButton(
				// 		"stylelayer",
				// 		"Categorized",
				// 		"stylelayer",
				// 		layer
				// 	);
				// 	layerControls.appendChild(
				// 		this.stopPropagationOnEvent(categorizedStyle, "click")
				// 	);
				// 	categorizedStyle.className = "btn btn-primary btn-sm";
				// 	layer.set("style", layer.getStyle());
				// 	layer.on(
				// 		"propertychange",
				// 		function(evt) {
				// 			if (evt.key === "headers") {
				// 				this.removeContent(attributeOptions);
				// 				const headers = layer.get("headers");
				// 				for (var i in headers) {
				// 					attributeOptions.appendChild(this.createOption(i));
				// 				}
				// 			}
				// 		},
				// 		this
				// 	);
				// }

				this.layerContainer.insertBefore(
					layerDiv,
					this.layerContainer.firstChild
				);
				return this;
			};

			// pass the map layer to the createRegistry method when it is added
			// and delete the layer when it is
			this.map.getLayers().on(
				"add",
				evt => {
					if (evt.element instanceof VectorLayer) {
						this.createRegistry(evt.element, true);
					} else {
						this.createRegistry(evt.element);
					}
				},
				this
			);
			this.map.getLayers().on(
				"remove",
				evt => {
					this.removeRegistry(evt.element);
					this.selectEventEmitter.changed();
				},
				this
			);
		} else {
			throw new Error("Invalid parameter(s) provided.");
		}
	}
}

Layertree.prototype.createButton = function(
	elemName,
	elemTitle,
	elemType,
	layer
) {
	const buttonElem = document.createElement("button");
	buttonElem.className = elemName;
	buttonElem.title = elemTitle;
	switch (elemType) {
		case "addlayer":
			buttonElem.addEventListener("click", function() {
				document.getElementById(elemName).style.display = "block";
			});
			return buttonElem;
		case "deletelayer":
			buttonElem.addEventListener("click", () => {
				if (this.selectedLayer) {
					const layer = this.getLayerById(this.selectedLayer.id);
					this.map.removeLayer(layer);
					this.messages.textContent = "Layer removed successfully.";
				} else {
					this.messages.textContent = "No selected layer to remove.";
				}
			});
			return buttonElem;
		case "stylelayer":
			buttonElem.textContent = elemTitle;
			if (elemTitle === "Default") {
				buttonElem.addEventListener("click", function() {
					layer.setStyle(layer.get("style"));
				});
			} else {
				let styleFunction =
					elemTitle === "Graduated"
						? this.styleGraduated
						: this.styleCategorized;
				buttonElem.addEventListener("click", () => {
					const attribute = buttonElem.parentNode.querySelector("select").value;
					styleFunction.call(this, layer, attribute);
				});
			}
			return buttonElem;
		default:
			return false;
	}
};

Layertree.prototype.addBufferIcon = function(layer) {
	layer.getSource().on("change", function(evt) {
		const layerElem = document.getElementById(layer.get("id"));
		switch (evt.target.getState()) {
			case "ready":
				layerElem.className = layerElem.className.replace(
					/(?:^|\s)(error|buffering)(?!\S)/g,
					""
				);
				break;
			case "error":
				layerElem.classList.add("error");
				break;
			default:
				layerElem.classList.add("buffering");
				break;
		}
	});
};

Layertree.prototype.removeContent = function(element) {
	while (element !== null) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
		return this;
	}
	return this;
};

Layertree.prototype.createOption = function(optionValue) {
	const option = document.createElement("option");
	option.value = optionValue;
	option.textContent = optionValue;
	return option;
};

Layertree.prototype.checkWmsLayer = function(form) {
	const formCheck = document.getElementById("checkwmslayer");
	const formLayer = document.getElementById("wmslayer");
	const formFormat = document.getElementById("wmsformat");
	const formServer = document.getElementById("wmsurl");

	formCheck.disabled = true;
	const _this = this;
	this.removeContent(formLayer).removeContent(formFormat);
	let url = formServer.value;
	url = /^((http)|(https))(:\/\/)/.test(url) ? url : "http://" + url;
	formServer.value = url;
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if (request.readyState === 4 && request.status === 200) {
			const parser = new WMSCapabilities();
			try {
				const capabilities = parser.read(request.responseText);
				const currentProj = _this.map
					.getView()
					.getProjection()
					.getCode();
				let crs;
				let messageText = "Layers read successfully.";
				if (capabilities.version === "1.3.0") {
					crs = capabilities.Capability.Layer.CRS;
				} else {
					crs = [currentProj];
					messageText +=
						" Warning! Projection compatibility could not be checked due to version mismatch (" +
						capabilities.version +
						").";
				}
				const layers = capabilities.Capability.Layer.Layer;
				if (layers.length > 0 && crs.indexOf(currentProj) > -1) {
					for (var i = 0; i < layers.length; i += 1) {
						formLayer.appendChild(_this.createOption(layers[i].Name));
					}
					const formats = capabilities.Capability.Request.GetMap.Format;
					for (i = 0; i < formats.length; i += 1) {
						formFormat.appendChild(_this.createOption(formats[i]));
					}
					_this.messages.textContent = messageText;
				}
			} catch (error) {
				_this.messages.textContent =
					"Some unexpected error occurred: (" + error.message + ").";
			} finally {
				formCheck.disabled = false;
			}
		} else if (request.status > 200) {
			formCheck.disabled = false;
		}
	};
	url = /\?/.test(url) ? url + "&" : url + "?";
	url = url + "REQUEST=GetCapabilities&SERVICE=WMS";
	//request.open("GET", "../assets/proxy.py?" + encodeURIComponent(url), true);
	request.open("GET", url, true);
	request.send();
};

Layertree.prototype.addWmsLayer = function(form) {
	const formDisplayname = document.getElementById("wmsdisplayname");
	const formLayer = document.getElementById("wmslayer");
	const formFormat = document.getElementById("wmsformat");
	const formServer = document.getElementById("wmsurl");
	let formTiledChecked = document.getElementById("wmstiled").checked;

	const params = {
		url: formServer.value,
		params: {
			layers: formLayer.value,
			format: formFormat.value
		}
	};
	let layer;
	if (formTiledChecked) {
		layer = new Tile({
			source: new TileWMS(params),
			name: formDisplayname.value
		});
	} else {
		layer = new Image({
			source: new ImageWMS(params),
			name: formDisplayname.value
		});
	}
	this.map.addLayer(layer);
	this.messages.textContent = "WMS layer added successfully.";
	return this;
};

Layertree.prototype.addWfsLayer = function(form) {
	const formServer = document.getElementById("wfsurl");
	const formLayer = document.getElementById("wfslayer");
	const formProjection = document.getElementById("wfsprojection");
	const formDisplayname = document.getElementById("wfsdisplayname");

	let url = formServer.value;
	url = /^((http)|(https))(:\/\/)/.test(url) ? url : "http://" + url;
	url = /\?/.test(url) ? url + "&" : url + "?";
	const typeName = formLayer.value;
	const mapProj = this.map
		.getView()
		.getProjection()
		.getCode();
	const proj = formProjection.value || mapProj;
	const parser = new WFS();
	const source = new VectorSource({
		strategy: bbox
	});
	const request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		if (request.readyState === 4 && request.status === 200) {
			source.addFeatures(
				parser.readFeatures(request.responseText, {
					dataProjection: proj,
					featureProjection: mapProj
				})
			);
		}
	};
	url =
		url +
		"service=WFS&version=1.0.0&request=GetFeature&typeName=cadmapping:" +
		typeName +
		"&outputFormat=application%2Fjson";
	//request.open('GET', '../../../cgi-bin/proxy.py?' + encodeURIComponent(url));
	request.open("GET", url);
	request.send();
	const layer = new VectorLayer({
		source: source,
		name: formDisplayname.value
	});
	this.addBufferIcon(layer);
	this.map.addLayer(layer);
	this.messages.textContent = "WFS layer added successfully.";
	return this;
};

Layertree.prototype.addVectorLayer = function(form) {
	const formFile = document.getElementById("vectorfile");
	const formFormat = document.getElementById("vectorformat");
	const formProjection = document.getElementById("vectorprojection");
	const formDisplayname = document.getElementById("vectordisplayname");

	const file = formFile.files[0];
	const currentProj = this.map.getView().getProjection();
	const fr = new FileReader();
	let sourceFormat;
	const source = new VectorSource();
	fr.onload = function(evt) {
		const vectorData = evt.target.result;
		switch (formFormat.value) {
			case "geojson":
				sourceFormat = new GeoJSON();
				break;
			case "topojson":
				sourceFormat = new TopoJSON();
				break;
			case "kml":
				sourceFormat = new KML();
				break;
			case "osm":
				sourceFormat = new OSMXML();
				break;
			default:
				return false;
		}
		const dataProjection =
			formProjection.value ||
			sourceFormat.readProjection(vectorData) ||
			currentProj;
		source.addFeatures(
			sourceFormat.readFeatures(vectorData, {
				dataProjection: dataProjection,
				featureProjection: currentProj
			})
		);
	};
	fr.readAsText(file);
	var layer = new VectorLayer({
		source: source,
		name: formDisplayname.value,
		strategy: bbox
	});
	this.addBufferIcon(layer);
	this.map.addLayer(layer);
	this.messages.textContent = "Vector layer added successfully.";
	return this;
};

Layertree.prototype.addShpLayer = function(form) {
	const shpForm = document.getElementById("addShp_form");
	const formSelect = document.getElementById("availableshps");
	const formFile = document.getElementById("shpfile");
	const formProjection = document.getElementById("vectorprojection");
	const formDisplayname = document.getElementById("shpdisplayname");

	let file = new Blob();

	const currentProj = this.map.getView().getProjection();
	const fr = new FileReader();
	const sourceFormat = new GeoJSON();
	const source = new VectorSource();

	if (formSelect.value !== "") {
		const shpData = `../assets/res/${formSelect.value}`;
		const dataProjection =
			formProjection.value ||
			sourceFormat.readProjection(shpData) ||
			currentProj;
		shpjs.getShapefile(shpData).then(function(geojson) {
			source.addFeatures(
				sourceFormat.readFeatures(geojson, {
					dataProjection: dataProjection,
					featureProjection: currentProj
				})
			);
		});
	} else {
		file = formFile.files[0];
		fr.onload = function(evt) {
			const shpData = evt.target.result;
			const dataProjection =
				formProjection.value ||
				sourceFormat.readProjection(shpData) ||
				currentProj;
			shpjs.getShapefile(shpData).then(function(geojson) {
				source.addFeatures(
					sourceFormat.readFeatures(geojson, {
						dataProjection: dataProjection,
						featureProjection: currentProj
					})
				);
			});
		};
		fr.readAsArrayBuffer(file);
	}

	shpForm.reset();

	var layer = new VectorLayer({
		source: source,
		name: formDisplayname.value,
		strategy: bbox
	});
	this.addBufferIcon(layer);
	this.map.addLayer(layer);
	this.messages.textContent = "Shapefile added successfully.";
	return this;
};

Layertree.prototype.addSelectEvent = function(node, isChild) {
	node.addEventListener("click", evt => {
		let targetNode = evt.target;
		if (isChild) {
			evt.stopPropagation();
			targetNode = targetNode.parentNode;
		}
		if (this.selectedLayer) {
			this.selectedLayer.classList.remove("active");
		}
		this.selectedLayer = targetNode;
		targetNode.classList.add("active");
		this.selectEventEmitter.changed();
		this.map.set("selectedLayer", this.getLayerById(targetNode.id));
	});
	return node;
};

Layertree.prototype.removeRegistry = function(layer) {
	var layerDiv = document.getElementById(layer.get("id"));
	this.layerContainer.removeChild(layerDiv);
	return this;
};

Layertree.prototype.getLayerById = function(id) {
	const layers = this.map.getLayers().getArray();
	for (var i = 0; i < layers.length; i += 1) {
		if (layers[i].get("id") === id) {
			return layers[i];
		}
	}
	return false;
};

Layertree.prototype.stopPropagationOnEvent = function(node, event) {
	node.addEventListener(event, function(evt) {
		evt.stopPropagation();
	});
	return node;
};

Layertree.prototype.graduatedColorFactory = function(classNum, rgb1, rgb2) {
	let colors = [];
	const steps = classNum - 1;
	const redStep = (rgb2[0] - rgb1[0]) / steps;
	const greenStep = (rgb2[1] - rgb1[1]) / steps;
	const blueStep = (rgb2[2] - rgb1[2]) / steps;
	for (var i = 0; i < steps; i += 1) {
		const red = Math.ceil(rgb1[0] + redStep * i);
		const green = Math.ceil(rgb1[1] + greenStep * i);
		const blue = Math.ceil(rgb1[2] + blueStep * i);
		colors.push([red, green, blue, 1]);
	}
	colors.push([rgb2[0], rgb2[1], rgb2[2], 1]);
	console.log("colors: ", colors);
	return colors;
};

Layertree.prototype.styleGraduated = function(layer, attribute) {
	if (layer.get("headers")[attribute] === "string") {
		this.messages.textContent =
			"A numeric column is required for graduated symbology.";
	} else {
		const attributeArray = [];
		layer.getSource().forEachFeature(function(feat) {
			attributeArray.push(feat.get(attribute));
		});
		const max = Math.max.apply(null, attributeArray);
		const min = Math.min.apply(null, attributeArray);
		const step = (max - min) / 5;
		const colors = this.graduatedColorFactory(5, [254, 240, 217], [179, 0, 0]);
		layer.setStyle(function(feature, res) {
			const property = feature.get(attribute);
			const color =
				property < min + step * 1
					? colors[0]
					: property < min + step * 2
						? colors[1]
						: property < min + step * 3
							? colors[2]
							: property < min + step * 4
								? colors[3]
								: colors[4];
			const style = new Style({
				stroke: new Stroke({
					color: [0, 0, 0, 1],
					width: 1
				}),
				fill: new Fill({
					color: color
				})
			});
			return [style];
		});
	}
};

Layertree.prototype.randomHexColor = function() {
	return "#" + Math.floor(Math.random() * 16777215).toString(16);
};

Layertree.prototype.styleCategorized = function(layer, attribute) {
	let attributeArray = [];
	let colorArray = [];
	let randomColor;
	layer.getSource().forEachFeature(feat => {
		console.log("GetAttribute: ", feat.get(attribute));
		const property = feat.get(attribute).toString();
		if (attributeArray.indexOf(property) === -1) {
			console.log("attributeArray: ", attributeArray);
			do {
				randomColor = this.randomHexColor();
			} while (colorArray.indexOf(randomColor) !== -1);
			colorArray.push(randomColor);
		}
	}, this);
	layer.setStyle(function(feature, res) {
		const index = attributeArray.indexOf(feature.get(attribute).toString());
		const style = new Style({
			stroke: new Stroke({
				color: [0, 0, 0, 1],
				width: 1
			}),
			fill: new Fill({
				color: colorArray[index]
			})
		});
		return [style];
	});
};

Layertree.prototype.newVectorLayer = function(form) {
	const type = document.getElementById("type").value;
	const formDisplayname = document.getElementById("newvectordisplayname");
	if (
		type !== "point" &&
		type !== "line" &&
		type !== "polygon" &&
		type !== "geomcollection"
	) {
		this.messages.textContent = "Unrecognized layer type.";
		return false;
	}
	const layer = new VectorLayer({
		source: new VectorSource(),
		name: formDisplayname.value || "Unnamed Layer",
		type: type
	});
	this.addBufferIcon(layer);
	this.map.addLayer(layer);
	layer.getSource().changed();
	this.messages.textContent = "New vector layer created successfully.";
	return this;
};

export default Layertree;
