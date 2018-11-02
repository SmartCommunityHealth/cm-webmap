cadmapping

This is a web mapping application written in react.js. It uses geoserver as the map server and postgis as the spatial database. The functionality of the app includes the following:

1. Ability to fetch layers from any WMS server, as long as you have the url.
2. Ability to fetch wfs layers from any WFS server as long as you have the url
3. Ability to add vector layers from you local storage. (currently only supports GeoJSON, TopoJSON, KML and OSMXML).
4. Ability to add vector layers through drag and drop onto the map canvas.
5. Ability to change the layer drawing order by dragging layers up or down on the layer tree and changing layer visibility.
6. Ability to change the layer's style. (currently supports opacity and a simple implementation of thematic mapping).
7. Basic Openlayers controls including the following:
   a. Zooming in and out.
   b. switching to a fullscreen map
   c. selecting a single feature and selecting using a dragbox
   e. drawing point, line and polygon features

Datasets:
The application uses the following datasets out of the box:
i. OSM vector data
ii. 5cm gsd imagery of Pretoria.

Setup Process:
To set up this application to run on your local disk, you need to follow this steps:

1. Install Node.js
2. Install Geoserver
3. Install PostgreSQL
4. Install the webapp:
   a. Clone the repository at https://github.com/bhekanik/cadmapping
   b. run npm install
   b. run npm start
   c. It should open http://localhost:3000/ in the browser automatically. Open it manually if it doesn't open automatically. The server supports hot reloading.

NB: Accessing data from the WMS or a WFS servers will require you to disable CORS on your browser.

User Manual:
This is how you use the application:

Libraries Used:

1. React.js: A JavaScript library for building user interfaces. React makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes. React does not make assumptions about the rest of your technology stack, so you can develop new features in React without rewriting existing code. https://reactjs.org/
2. Redux: Redux is a predictable state container for JavaScript apps. It helps you write applications that behave consistently, run in different environments (client, server, and native), and are easy to test. On top of that, it provides a great developer experience, such as live code editing combined with a time traveling debugger. You can use Redux together with React, or with any other view library. https://redux.js.org/
3. React Redux: React-Redux is the official React binding for Redux. It lets your React components read data from a Redux store, and dispatch actions to the store to update data. https://react-redux.js.org/
4. React Bootstrap: The most popular front-end framework, Bootstrap rebuilt for React. https://react-bootstrap.github.io/
5. Openlayers: OpenLayers makes it easy to put a dynamic map in any web page. It can display map tiles, vector data and markers loaded from any source. OpenLayers has been developed to further the use of geographic information of all kinds. http://openlayers.org/

Known Bugs and Limitations:

1. No tests have been written.
2. No error handling has been written.
3. Not enough time to work on the UI.
4. Layer name moves to the bottom of the div when the layer is selected.
5. Attributs popup doesn't display all the attributes of a layer.6.
6. The button for categorised styling doesn't work for now.

The following are planned implementations:

1. Implementing a legend control either by using the ol-ext library or building it from scratch if the library doesn't provide all the suitable fuctionality.
2. Implement a globe view using the cesium library.
3. Add fly-to animation.

Areas of Improvement:

1. With more time the UI definitely needs more work to look more appealing

License:
This software is licensed under the GNU Affero General Public License Version 3, 19 November 2007. Find more information in the LICENSE file.
