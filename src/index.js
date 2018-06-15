import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'leaflet/dist/leaflet.css'
import App from './App';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<App radiusSensitivity={0.001} startPosition={[47.6036, -122.329]} zoom={15} />, document.getElementById('root'));


registerServiceWorker();
