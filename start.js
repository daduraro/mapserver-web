// webpack import styles
import 'ol/ol.css';
import './style.css';
import 'ol-ext/dist/ol-ext.css';

// import from ol package
import Map from 'ol/Map';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';import View from 'ol/View';
import Zoomify from 'ol/source/Zoomify';
import MouseWheelZoom from 'ol/interaction/MouseWheelZoom';
import PinchZoom from 'ol/interaction/PinchZoom';
import DragPan from 'ol/interaction/DragPan';
import {Vector as VectorSource} from 'ol/source';
import {Select} from 'ol/interaction';
import {Point} from 'ol/geom';
import {} from 'ol/events/condition';
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';

// import from ol-ext package
import LongTouch from 'ol-ext/interaction/LongTouch';

import { getCenter } from 'ol/extent';

export function main(args) {

  var raster_source = new Zoomify({
    url: args.imgUrl,
    size: [args.imgWidth, args.imgHeight],
    crossOrigin: 'anonymous',
    zDirection: -1,
  });
  var extent = raster_source.getTileGrid().getExtent();
  var raster = new TileLayer({
    source: raster_source,
  });
  
  var vector = new VectorLayer({
    source: new VectorSource({wrapX: false}),
    updateWhileInteracting: true,
  });
  
  var map = new Map({
    layers: [raster, vector],
    target: 'map',
    view: new View({
      resolutions: raster.getSource().getTileGrid().getResolutions(),
      extent: extent,
      constrainOnlyCenter: true,
      center: getCenter(extent),
    }),
    controls: [],
    interactions: [],
  });
  map.getView().fit(extent);
  
  map.addInteraction(new MouseWheelZoom());
  map.addInteraction(new PinchZoom());
  map.addInteraction(new DragPan());
  
  function addPoint(e)
  {
    let p = new Feature(new Point(e.coordinate));
    vector.getSource().addFeature(p);
    setSelected(p);
  };
  
  map.addInteraction(new LongTouch({
    handleLongTouchEvent: addPoint,
  }))
  
  var select = new Select();
  map.addInteraction(select)
  
  // popup logic
  var container = document.getElementById('popup');
  var closer = document.getElementById('popup-closer');
  var content = document.getElementById('popup-content');
  var content_edit = document.getElementById('popup-content-edit');
  
  var popup = new Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
      duration: 250,
    },
  });
  map.addOverlay(popup);
  
  function setSelected(e)
  {
    select.getFeatures().clear();
    if (e) {
      select.getFeatures().push(e);
    }
    updatePopup();
  }
  
  select.on('select', function (e) {
    updatePopup()
  });
  
  closer.onclick = function () {
    setSelected(undefined);
    closer.blur();
    return false;
  };
  
  function updatePopup()
  {
    if (select.getFeatures().getLength())
    {
      let feature = select.getFeatures().item(0);
      popup.setPosition(feature.getGeometry().getCoordinates());
      setPopupContent(feature);
    }
    else
    {
      popup.setPosition(undefined);
    }
  }
  
  function setPopupContent(feature)
  {
    if (feature.info && (feature.info.title || feature.info.descr))
    {
      setPopupDisplayContent(feature);
    }
    else
    {
      setPopupEditContent(feature);
    }
  }
  
  function setPopupDisplayContent(feature)
  {
    content.hidden = false;
    content_edit.hidden = true;
  
    var title = document.getElementById("title");
    var descr = document.getElementById("descr");
    
    title.hidden = feature.info.title === "";
    descr.hidden = feature.info.descr === "";
  
    const regex = /[\r]?\n/g;
    title.innerHTML = feature.info.title.replaceAll(regex, "<br/>");
    descr.innerHTML = feature.info.descr.replaceAll(regex, "<br/>");
  
    console.log(title);
  }
  
  function setPopupEditContent(feature)
  {
    content_edit.hidden = false;
    content.hidden = true;
    
    if (feature.info === undefined)
    {
      feature.info = {title: "", descr: ""};
    }
  
    var title = document.getElementById("title-edit");
    var descr = document.getElementById("descr-edit");
  
    title.focus();
  
    title.value = feature.info.title;
    descr.value = feature.info.descr;
  
    title.oninput = function() {
      feature.info.title = title.value;
    };
  
    descr.oninput = function() {
      feature.info.descr = descr.value;
    }
  }
  
  var f = new DelayableFunc(function() { console.log("hey!") }, 1000);
  
  function DelayableFunc(func, timeout)
  {
    const run = timeout => setTimeout(func, timeout)
    this.handler = run(timeout)
    this.delay = timeout => {
      clearTimeout(this.handler)
      this.handler = run(timeout)
    }
  }

}