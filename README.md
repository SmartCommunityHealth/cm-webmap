# **cm-webapp**

---

A web mapping application written in react.js which includes a custom toolbar and Layertree. It uses Geoserver as the map server and Postgis as the spatial database. The functionality of the app includes the following:

1. Fetching layers from any WMS server, as long as you have the url.
2. Adding vector layers from your local storage. (currently only supports GeoJSON, TopoJSON, KML and OSMXML). Also supports adding via drag and drop onto the map canvas.
3. Changing the layer drawing order by dragging layers up or down on the layer tree, changing layer visibility and varying the opacity.
4. Importing shapefiles.
5. Basic Openlayers controls including the following:
   a. Zooming in and out.
   b. switching to a fullscreen map
   c. selecting a single feature and selecting using a dragbox
   e. drawing new point, line and polygon features
   f. modifying features,
   g. zooming to the full extent of the map

### Datasets:

The application uses the following datasets out of the box:
i. OSM vector data
ii. 5cm gsd imagery of Pretoria.
iii. Landsat 7 Satelite imagery

### Setup Process:

To set up this application to run on your local disk, you need to follow this steps:

1. Install Node.js
2. Install Geoserver
3. Install PostgreSQL
4. Install the webapp:
   a. Clone the repository at https://github.com/bhekanik/cm-webmap
   b. run `npm install`
   c. run `npm start`
   d. It should open http://localhost:3000/ in the browser automatically. Open it manually if it doesn't open automatically. The server supports hot reloading.

NB: Accessing data from the WMS or a WFS servers will require you to disable CORS on your browser.

### User Manual:

This is how you use the application:

### Libraries Used:

1. React.js: A JavaScript library for building user interfaces. React makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes. React does not make assumptions about the rest of your technology stack, so you can develop new features in React without rewriting existing code. https://reactjs.org/
2. Redux: Redux is a predictable state container for JavaScript apps. It helps you write applications that behave consistently, run in different environments (client, server, and native), and are easy to test. On top of that, it provides a great developer experience, such as live code editing combined with a time traveling debugger. You can use Redux together with React, or with any other view library. https://redux.js.org/
3. React Redux: React-Redux is the official React binding for Redux. It lets your React components read data from a Redux store, and dispatch actions to the store to update data. https://react-redux.js.org/
4. React Bootstrap: The most popular front-end framework, Bootstrap rebuilt for React. https://react-bootstrap.github.io/
5. Openlayers: OpenLayers makes it easy to put a dynamic map in any web page. It can display map tiles, vector data and markers loaded from any source. OpenLayers has been developed to further the use of geographic information of all kinds. http://openlayers.org/
6. Shapefile.js: Library for converting shapefiles to GeoJSON. https://github.com/calvinmetcalf/shapefile-js
7. Turf: Library for performing advanced geospatial analysis for browsers and Node.js. http://turfjs.org/

### Known Bugs and Limitations:

1. No tests have been written.
2. No error handling has been written.
3. Importing of satelite and aerial imagery not implemented.
4. Exporting of shapefiles not implemented.
5. 3D rendering of globe view using cesium not implemented.
6. Issue with zooming to the extent of a layer not resolved yet.

The following are planned implementations:

1. Implementing a legend control either by using the ol-ext library or building it from scratch if the library doesn't provide all the suitable fuctionality.
2. Implement a globe view using the cesium library.
3. Add fly-to animation.
4. Ability to fetch wfs layers from any WFS server as long as you have the url

### Areas of Improvement:

1. With more time the UI definitely needs more work to look more appealing,
2. Bug fixes
3. Create documentation with JSDoc.

License:
This software is licensed under the GNU Affero General Public License Version 3, 19 November 2007. Find more information in the LICENSE file. Libraries used use their respective licenses.
