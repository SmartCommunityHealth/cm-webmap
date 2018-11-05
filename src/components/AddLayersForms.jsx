import React, { Component } from "react";

import { Table, FormControl, Button } from "react-bootstrap";

import { connect } from "react-redux";

export class AddLayersForms extends Component {
	render() {
		return (
			<div>
				<div id="addwms" className="toggleable" style={{ display: "none" }}>
					<form
						id="addwms_form"
						className="addlayer"
						onSubmit={evt => {
							evt.preventDefault();
							this.props.layertree.addWmsLayer(this);
							document.getElementById("addwms").style.display = "none";
						}}
					>
						<h3 style={{ justifyContent: "center" }}>Add WMS layer</h3>
						<Table>
							<tbody>
								<tr>
									<td>Server URL:</td>
									<td>
										<FormControl
											id="wmsurl"
											name="server"
											type="text"
											required="required"
											defaultValue="http://localhost:7000/geoserver/cadmapping/wms"
										/>
									</td>
									<td>
										<Button
											id="checkwmslayer"
											name="check"
											bsStyle="primary"
											onClick={() => {
												this.props.layertree
													.removeContent(document.getElementById("wmslayer"))
													.removeContent(document.getElementById("wmsformat"));
												this.props.layertree.checkWmsLayer(this.form);
											}}
										>
											Check for layers
										</Button>
									</td>
								</tr>
								<tr>
									<td>Layer name:</td>
									<td>
										<select id="wmslayer" name="layer" required="required" />
									</td>
								</tr>
								<tr>
									<td>Display name:</td>
									<td>
										<FormControl
											id="wmsdisplayname"
											name="displayname"
											type="text"
										/>
									</td>
								</tr>
								<tr>
									<td>Format:</td>
									<td>
										<select id="wmsformat" name="format" required="required" />
									</td>
								</tr>
								<tr>
									<td>Tiled:</td>
									<td>
										<FormControl id="wmstiled" type="checkbox" name="tiled" />
									</td>
								</tr>
								<tr>
									<td>
										<FormControl
											className="btn btn-primary"
											type="submit"
											value="Add layer"
										/>
									</td>
									<td>
										<Button
											bsStyle="danger"
											onClick={() =>
												(document.getElementById("addwms").style.display =
													"none")
											}
										>
											Cancel
										</Button>
									</td>
								</tr>
							</tbody>
						</Table>
					</form>
				</div>
				<div id="addwfs" className="toggleable" style={{ display: "none" }}>
					<form
						id="addwfs_form"
						className="addlayer"
						onSubmit={evt => {
							evt.preventDefault();
							this.props.layertree.addWfsLayer(this);
							document.getElementById("addwfs").style.display = "none";
						}}
					>
						<h3>Add WFS layer</h3>
						<Table>
							<tbody>
								<tr>
									<td>Server URL:</td>
									<td>
										<FormControl
											id="wfsurl"
											name="server"
											type="text"
											required="required"
											defaultValue="http://localhost:7000/geoserver/ows?"
											// value="http://demo.mapserver.org/cgi-bin/wfs"
										/>
									</td>
								</tr>
								<tr>
									<td>Layer name:</td>
									<td>
										<FormControl
											id="wfslayer"
											name="layer"
											type="text"
											required="required"
										/>
									</td>
								</tr>
								<tr>
									<td>Display name:</td>
									<td>
										<FormControl
											id="wfsdisplayname"
											name="displayname"
											type="text"
										/>
									</td>
								</tr>
								<tr>
									<td>Projection:</td>
									<td>
										<FormControl
											id="wfsprojection"
											name="projection"
											type="text"
											defaultValue="EPSG:4326"
										/>
									</td>
								</tr>
								<tr>
									<td>
										<FormControl
											type="submit"
											value="Add layer"
											className="btn btn-primary"
										/>
									</td>
									<td>
										<Button
											bsStyle="danger"
											onClick={() =>
												(document.getElementById("addwfs").style.display =
													"none")
											}
										>
											Cancel
										</Button>
									</td>
								</tr>
							</tbody>
						</Table>
					</form>
				</div>
				<div id="addvector" className="toggleable" style={{ display: "none" }}>
					<form
						id="addvector_form"
						className="addlayer"
						onSubmit={evt => {
							evt.preventDefault();
							this.props.layertree.addVectorLayer(this);
							document.getElementById("addvector").style.display = "none";
						}}
					>
						<h3>Add Vector layer</h3>
						<Table>
							<tbody>
								<tr>
									<td>Vector file:</td>
									<td>
										<FormControl
											id="vectorfile"
											name="file"
											type="file"
											required="required"
										/>
									</td>
								</tr>
								<tr>
									<td>Display name:</td>
									<td>
										<FormControl
											id="vectordisplayname"
											name="displayname"
											type="text"
										/>
									</td>
								</tr>
								<tr>
									<td>Format:</td>
									<td>
										<select id="vectorformat" name="format" required="required">
											<option value="geojson">GeoJSON</option>
											<option value="topojson">TopoJSON</option>
											<option value="kml">KML</option>
											<option value="osm">OSM</option>
										</select>
									</td>
								</tr>
								<tr>
									<td>Projection:</td>
									<td>
										<FormControl
											id="vectorprojection"
											name="projection"
											type="text"
										/>
									</td>
								</tr>
								<tr>
									<td>
										<FormControl
											className="btn btn-primary"
											type="submit"
											value="Add layer"
										/>
									</td>
									<td>
										<Button
											value="Cancel"
											bsStyle="danger"
											onClick={() => {
												document.getElementById("addvector").style.display =
													"none";
											}}
										>
											Cancel
										</Button>
									</td>
								</tr>
							</tbody>
						</Table>
					</form>
				</div>
				<div id="newshp" className="toggleable" style={{ display: "none" }}>
					<form
						id="addShp_form"
						className="addlayer"
						onSubmit={evt => {
							evt.preventDefault();
							this.props.layertree.addShpLayer(this);
							document.getElementById("newshp").style.display = "none";
						}}
					>
						<h3>Add Shapefile</h3>
						<Table>
							<tbody>
								<tr>
									<td>Available Shapefiles:</td>
									<td>
										<select id="availableshps" name="availableshps">
											<option value="">None</option>
											<option value="tshwane_boundary.zip">
												Tshwane Boundary
											</option>
											<option value="tshwane_buildings.zip">
												Tshwane Buildings
											</option>
											<option value="tshwane_places.zip">Tshwane Places</option>
											<option value="tshwane_roads.zip">Tshwane Roads</option>
											<option value="tshwane_waterbodies.zip">
												Tshwane Waterbodies
											</option>
										</select>
									</td>
								</tr>
								<tr>
									<td>Add New Shapefile:</td>
									<td>
										<FormControl
											id="shpfile"
											name="shpfile"
											type="file"
											accept=".zip"
										/>
									</td>
								</tr>
								<tr>
									<td>Display name:</td>
									<td>
										<FormControl
											id="shpdisplayname"
											name="displayname"
											type="text"
										/>
									</td>
								</tr>
								<tr>
									<td>Projection:</td>
									<td>
										<FormControl name="projection" type="text" />
									</td>
								</tr>
								<tr>
									<td>
										<FormControl
											className="btn btn-primary"
											type="submit"
											value="Add layer"
										/>
									</td>
									<td>
										<Button
											type="button"
											bsStyle="danger"
											value="Cancel"
											onClick={() => {
												document.getElementById("newshp").style.display =
													"none";
											}}
										>
											Cancel
										</Button>
									</td>
								</tr>
							</tbody>
						</Table>
					</form>
				</div>

				<div id="newvector" className="toggleable" style={{ display: "none" }}>
					<form
						id="newvector_form"
						className="addlayer"
						onSubmit={evt => {
							evt.preventDefault();
							this.props.layertree.newVectorLayer(this);
							document.getElementById("newvector").style.display = "none";
						}}
					>
						<h3>New Vector layer</h3>
						<Table>
							<tbody>
								<tr>
									<td>Display name:</td>
									<td>
										<FormControl
											id="newvectordisplayname"
											name="displayname"
											type="text"
										/>
									</td>
								</tr>
								<tr>
									<td>Type:</td>
									<td>
										<select
											id="type"
											name="type"
											required="required"
											className="form-control"
										>
											<option value="point">Point</option>
											<option value="line">Line</option>
											<option value="polygon">Polygon</option>
											<option value="geomcollection">
												Geometry Collection
											</option>
										</select>
									</td>
								</tr>
								<tr>
									<td>
										<FormControl
											className="btn btn-primary"
											type="submit"
											value="Add layer"
										/>
									</td>
									<td>
										<Button
											bsStyle="danger"
											value="Cancel"
											onClick={() =>
												(document.getElementById("newvector").style.display =
													"none")
											}
										>
											Cancel
										</Button>
									</td>
								</tr>
							</tbody>
						</Table>
					</form>
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => ({
	layertree: state.layertree,
	map: state.map
});

export default connect(mapStateToProps)(AddLayersForms);
