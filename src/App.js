import React, { Component } from 'react';
import './App.css';
import { Map, TileLayer, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import loader from "./imgs/ajax-loader.gif";
import 'bootstrap/dist/css/bootstrap.css';
import { Input, Button } from 'reactstrap';
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Line } from 'recharts';
import _ from 'lodash';
import moment from 'moment';
import Sidebar from 'react-side-bar';
import './sidebar.css';

// MarkerList is a list of all active points within a radius of a user's click
class MarkerList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currLocationX: -1,
            currLocationY: -1,
            pointData: [],
            theftData: [],
            points: [],
            maxTheft: 0,
            hidden: true
        };
        this.processData = this.processData.bind(this);
        this.getData = this.getData.bind(this);
    }

    // processData processes the raw API call data from this.state,
    // and stores each point into this.state.points
    processData() {
        let bikeRacks = this.state.pointData;
        let bikeThefts = this.state.theftData;

        // Store temporary points and theftcount to update state all at once later
        let tempPoints = [];
        let tempMaxTheft = 0;
        let tempMinTheft = 0;

        // For each bike rack determine facts about the bike rack.
        bikeRacks.forEach((rack, index) => {
            let point = {};
            point.latitude = rack.latitude;
            point.longitude = rack.longitude;
            point.data = [];

            // Go through each theft and see which one matches each rack
            let count = 0;
            bikeThefts.forEach((theft) => {
                if (Math.abs(theft.latitude - rack.latitude < this.props.radiusSensitivity) &&
                    Math.abs(theft.longitude - rack.longitude < this.props.radiusSensitivity)) {
                    count++;
                    let dataPoint = _.find(point.data, { date: moment([theft.year, theft.month]).valueOf() });
                    if (point.data.length === 0 || dataPoint === undefined) {
                        point.data.push({ date: moment([theft.year, theft.month]).valueOf(), count: 1 });
                    } else {
                        dataPoint.count++;
                    }
                }
            })

            // Order the thefts so graphing appears correctly later
            point.data = _.orderBy(point.data, ['date', 'asc']);

            // keep track of maximum amount of thefts in this set
            if (count > tempMaxTheft) {
                tempMaxTheft = count;
            }

            // keep track of minimum thefts
            if (index === 0 || tempMinTheft > count) {
                tempMinTheft = count;
            }

            point.theftCount = count;
            tempPoints.push(point);
        });

        // set colors for each point
        tempPoints.forEach((point) => {
            point.theftCount === tempMinTheft ? point.color = 'rgb(0,0,255)' : point.color = this.findColor(point, tempMaxTheft);
            point.safetyRating = this.findSafetyRating(point, tempMaxTheft);
        });

        // ensure all points are up to date
        this.setState({ points: tempPoints, maxTheft: tempMaxTheft, hidden: true });
    }

    // findSafetyRating is a global function that determines how
    // unsafe a bike rack is
    // @param   point       point of bike rack
    // @param   maxTheft    number of maximum thefts calculated
    // @return              A string that says if it's unsafe or not
    findSafetyRating(point, maxTheft) {
        if (point.theftCount < 0.05 * maxTheft) return "Safest nearby";
        else if (point.theftCount < 0.15 * maxTheft) return "Kind of safe in comparison";
        else if (point.theftCount < 0.5 * maxTheft) return "Getting unsafe in comparison";
        else if (point.theftCount < 0.75 * maxTheft) return "Pretty unsafe in comparison";
        else return "Most unsafe nearby!";
    }

    // findColor is a global function that determines the color
    // of a point
    // @param   point       point of a bike rack
    // @param   maxTheft    number of maximum thefts calculated
    // @return              a string in the format `rgba(##, ##, 0)`
    findColor(point, maxTheft) {
        let red = Math.floor(point.theftCount / maxTheft * 255);
        let green = 255 - red;
        return `rgb(${red}, ${green}, 0)`;
    }

    // getData gets the bike rack data from the specified coordinates and a radius of 400 meters
    // if locationX and locationY are both equal to 9999999, there will be an override that
    // shows all bike racks and thefts. Will take long to process!
    // @param   locationX   latitude in
    // @param   locationY   longitude in
    // @param   radius      radius of bike rack from selection center
    getData(locationX, locationY, radius) {
        this.setState({ currLocationX: locationX, currLocationY: locationY });
        let withinCircleRacks = `$where=within_circle(rack_location, ${locationX}, ${locationY}, ${radius})&`;
        let withinCircleThefts = `$where=within_circle(location, ${locationX}, ${locationY}, ${radius * 2})&`;

        // If this case is matched, grab all
        // Far easier solution than adding another variable to keep track of
        if (locationX === 9999999 && locationY === 9999999) {
            withinCircleRacks = ``;
            withinCircleThefts = ``;
        }

        // fetch setting state but setting state before going onto next 
        // parallel fetching using Promise.all to process the data simply was not working, 
        // so I had to chain them together.
        fetch(`https://data.seattle.gov/resource/fxh3-tqdm.json?${withinCircleRacks}$limit=999999`)
            .then((r) => r.json())
            .then((r) => this.setState({ pointData: r }))
            .then(
            fetch(`https://data.seattle.gov/resource/y7pv-r3kh.json?${withinCircleThefts}offense_type=THEFT-BICYCLE&$limit=999999`)
                .then((r) => r.json())
                .then((r) => this.setState({ theftData: r }))
                .then(this.processData)
            );
    }

    // Update on prop change
    // this.props isn't being updated correctly
    componentWillReceiveProps(inProp) {
        if (this.state.currLocationX !== inProp.locationX || this.state.currLocationY !== inProp.locationY) {
            this.setState({ hidden: false })
            this.getData(inProp.locationX, inProp.locationY, inProp.radius);
        }
    }

    // when component mounts, start grabbing data and then process it
    componentDidMount() {
        this.getData(this.props.locationX, this.props.locationY, this.props.radius);
    }

    // render the object along with loading wheel
    render() {
        return (
            <div>
                <LoadingWheel hidden={this.state.hidden} />
                {
                    this.state.points.map((point, index) => {
                        return (
                            <CircleMarker center={L.latLng(point.latitude, point.longitude)}
                                radius={6}
                                fill={true}
                                color={point.color}
                                fillColor={point.color}
                                fillOpacity="0.75"
                                key={"point" + index} >
                                <PopPoint point={point} maxTheft={this.state.maxTheft} />
                            </CircleMarker>
                        )
                    })
                }
            </div >
        )
    }
}

// Sets up each point's popup view with a line chart
class PopPoint extends Component {
    render() {
        return (
            <Popup>
                <div>
                    <strong>Danger Level: {this.props.point.safetyRating}</strong>
                    <progress value={this.props.point.theftCount} max={this.props.maxTheft} /><br />
                    <p>A total of {this.props.point.theftCount} bicycle thefts have been reported within two blocks from this
                                            bike rack. <br /><br /></p>
                    <LineChart width={250} height={200} data={this.props.point.data} margin={{ top: 0, right: 0, left: 10, bottom: 25 }}>
                        <XAxis label={{ value: "Year", position: "bottom" }} dataKey="date" domain={["auto", "auto"]} type="number" tickFormatter={(date) => { return moment(date).format('YYYY') }} />
                        <YAxis domain={["auto, auto"]} label={{ value: "Theft count", angle: -90, position: 'insideLeft' }} />
                        <CartesianGrid stroke="#eee" strokeDashArray="3 3" />
                        <Tooltip labelFormatter={(date) => { return moment(date).format('YYYY MMM') }} />
                        <Line dot={false} type="monotone" dataKey="count" stroke={this.props.point.color} fill={this.props.point.color} />
                    </LineChart>
                    <p>
                        <a href={`https://www.google.com/maps?q=&layer=c&cbll=${this.props.point.latitude},${this.props.point.longitude}`} target={"_blank"}>
                            Google Street View
                                        </a>
                    </p>
                    <p>Latitude: {this.props.point.latitude}</p>
                    <p>Longitude: {this.props.point.longitude}</p>
                </div>
            </Popup>
        )
    }
}

// Application component
class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            latitude: 0,
            longitude: 0,
            opened: false,
            radius: 200
        };
        this.toggleBar = this.toggleBar.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onOpen = this.onOpen.bind(this);
        this.setLatLng = this.setLatLng.bind(this);
        this.setRadius = this.setRadius.bind(this);

    }

    // Toggle the sidebar
    toggleBar() {
        this.setState({ opened: !this.state.opened })
    }

    // Close the sidebar
    onClose() {
        this.setState({ opened: false });
    }

    // Open the sidebar
    onOpen() {
        this.setState({ opened: true });
    }


    // Set state of latitude and longitude of a map onclick event.
    // Used to get the active click for updating points
    // @param   event       Leaflet Map click event
    setLatLng(event) {
        this.setState({
            latitude: event.latlng.lat,
            longitude: event.latlng.lng
        });
    }

    // setradius sets the radius of user input
    // @param   event       event of the user input
    setRadius(event) {
        let setVal = 200;
        if (event.target.value !== "") {
            setVal = event.target.value;
        }
        this.setState({
            radius: setVal
        })
    }

    // Render the map and sidebar
    render() {
        const navIconClassName = ['nav-icon'];

        if (this.state.opened) {
            navIconClassName.push('open');
        }
        return (
            <div>
                <Sidebar bar={(<SidebarContent setRadius={this.setRadius} loadAll={this.setLatLng} />)}
                    size={300}
                    side="left"
                    duration={300}
                    mode="over"
                    tolerance={80}
                    touch={true}
                    fx="cubic-bezier(0, 1, 0.85, 1)"
                    topBar={(<div className='topBar'>
                        <div className='left'>
                            <div
                                className={navIconClassName.join(' ')}
                                onClick={() => this.toggleBar()}>
                                <span /><span /><span /><span />
                            </div>
                        </div>
                        <div className='center titleBar'>Seattle SafeCycleJS</div>
                        <div className='right'></div>
                    </div>)}
                    opened={this.state.opened}
                    onClose={() => this.onClose()}
                    onOpen={() => this.onOpen()}>

                    {/*This next area is necessary to put in an array, otherwise the sidebar library I used creates a warning, because it expects an array instead of a react object*/}
                    {
                        [<div key="errorFixer">
                            <Map onClick={(e) => this.setLatLng(e)} center={this.props.startPosition} zoom={this.props.zoom}>
                                <TileLayer
                                    attribution="<a href=&quot;https://data.seattle.gov/&quot;>Seattle Open Data</a> | &copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MarkerList radius={this.state.radius} radiusSensitivity={this.props.radiusSensitivity} locationX={this.state.latitude} locationY={this.state.longitude} />
                            </Map>
                        </div>]
                    }
                </Sidebar>

            </div>
        );
    }
}

// SidebarContent is the content inside the sidebar
class SidebarContent extends Component {
    render() {
        return (
            <div className="side">
                <div className="sidebarDescription">Click or tap on an area to find a safe bike rack nearby! <span className="blue">Blue</span> points will be the safest in a 200 meter radius. Click on the point to learn more information!</div>
                <hr />
                <div>Set a custom rack finding radius!</div>
                <Input placeholder="Rack radius (default: 200 meters)" type="number" name="radius" id="radiusS" onChange={this.props.setRadius} />
                <hr />
                <div>Click to load all bike racks in Seattle. <span className="red">Warning</span>, this will take at least 45 seconds to process, and your page may become unresponsive! This feature may take a lot longer on mobile or older PCs.</div>
                <div className="center"><Button onClick={() => this.props.loadAll({ latlng: { lat: 9999999, lng: 9999999 } })} color="primary">I understand! See all.</Button></div>
                <hr />
                <div>Thanks to the Seattle Open Data Portal for providing the <a href="https://data.seattle.gov/Transportation/City-of-Seattle-Bicycle-Racks/vncn-umqp">bike rack data</a> as
                 well as the <a href="https://data.seattle.gov/Public-Safety/Seattle-Police-Department-Police-Report-Incident/7ais-f98f">theft data</a></div>
                <hr />
                <div className="center"><a href="https://github.com/info343a-w18/p3-mockingod1841">Github link (private for now)</a></div>
                <div className="center">&copy;reated by William Kwok, 2018</div>
            </div>
        )
    }
}

// LoadingWheel class, creates a loading wheel that appears when fetch is happening
// so user has a reactive feedback
class LoadingWheel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hidden: true
        }
    }

    // Will receive change in properties
    componentWillReceiveProps(props) {
        this.setState({ hidden: props.hidden });
    }

    // Will mount
    componentDidMount() {
        this.setState({ hidden: this.props.hidden });
    }

    // Render the loading wheel
    render() {
        return (
            <div className={`loadingWheel ${this.state.hidden ? "hidden" : ""}`}>
                <img src={loader} alt="loading wheel" />
            </div>
        )
    }
}

export default App;