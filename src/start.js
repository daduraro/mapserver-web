// webpack import styles
import 'ol/ol.css';
import '../css/style.css';
import '../fontello/css/fontello.css'
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
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import { Style, Fill, Stroke, Circle } from 'ol/style';
import {mouseOnly, touchOnly, singleClick, never} from 'ol/events/condition';
import PointerInteraction from 'ol/interaction/Pointer';

// import from ol-ext package
import LongTouch from 'ol-ext/interaction/LongTouch';

import { getCenter } from 'ol/extent';
import { Collection } from 'ol';


export function main(args) {

  var unselectedPointStyle = new Style({
    image: new Circle({
      fill: new Fill({
        color: 'rgba(255,255,255,0.4)'
      }),
      stroke: new Stroke({
        color: '#3399CC',
        width: 2.25
      }),
      radius: 7
    }),
    zIndex: Infinity,
  });

  var raster_source = new Zoomify({
    url: args.img_url,
    size: [args.img_width, args.img_height],
    crossOrigin: 'anonymous',
    zDirection: -1,
  });
  var extent = raster_source.getTileGrid().getExtent();
  var raster = new TileLayer({
    source: raster_source,
  });
  
  var vector = new VectorLayer({
    source: new VectorSource({wrapX: false}),
    style: unselectedPointStyle,
    updateWhileInteracting: true,
  });


  // add more levels of zoom
  var resolutions = raster.getSource().getTileGrid().getResolutions();
  resolutions = resolutions.concat( [2,4,8].map(function(x) {return this/x }, Math.min(...resolutions))  )
  
  var map = new Map({
    layers: [raster, vector],
    target: 'map',
    view: new View({
      resolutions: resolutions,
      extent: extent,
      constrainOnlyCenter: true,
      center: getCenter(extent),
      zoomFactor: 2,
    }),
    controls: [],
    interactions: [],
  });
  map.getView().fit(extent);
  
  /////////////////////////////////////////////////
  // INTERACTIONS
  /////////////////////////////////////////////////
  map.addInteraction(new MouseWheelZoom());
  map.addInteraction(new PinchZoom());
  map.addInteraction(new DragPan());
  
  map.addInteraction(new LongTouch({
    handleLongTouchEvent: createPoint,
  }))

  var selectedElements = new Collection();
  map.addInteraction((() => {
    let sel = new Select(
    {
      features: selectedElements,
      layers: [vector],
      condition: (e) => mouseOnly(e) && singleClick(e),
      toggleCondition: never,
    });
    sel.on('select', (e) => updatePopup());
    return sel
  })());
  
  map.addInteraction((() => {
    let sel = new Select(
    {
      features: selectedElements,
      layers: [vector],
      condition: (e) => touchOnly(e) && singleClick(e),
      toggleCondition: never,
      hitTolerance: 10, // are those 96dpi px? or should they be scaled with window.devicePixelRatio ?
    });
    sel.on('select', (e) => updatePopup());
    return sel;
  })());

  // add event pointer event sink when creating a point
  map.addInteraction(new PointerInteraction({
    handleEvent: (e) => {
      if (e.type == "singleclick")
      {
        return !creatingPoint; // absorb singleclick events when creating point
      }
      return true;
    }
  }));

  /////////////////////////////////////////////////
  // LOGIC
  /////////////////////////////////////////////////

  // create point logic
  var creatingPoint = false;
  var creatingPointToFalse = new DelayableFunc(()=>{
    creatingPoint = false;
  });
  function createPoint(interactionEvent)
  {
    creatingPoint = true;
    creatingPointToFalse.delay(2000);
    let point = new Feature(new Point(interactionEvent.coordinate));
    point.info = {
      id: fetch("create_point", {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(point.getGeometry().getFlatCoordinates())
          }).then((response) => response.json())
            .then((data) => data.id),
      title: "",
      descr: ""
    };
    vector.getSource().addFeature(point);
    setSelected(point);
  };

  // popup logic
  var container = document.getElementById('popup');
  var closer = document.getElementById('popup-closer');
  var content = document.getElementById('popup-content');
  var content_edit = document.getElementById('popup-content-edit');

  var edit_button = document.getElementById('popup-edit');
  var ok_button = document.getElementById('popup-ok');
  var delete_button = document.getElementById('popup-deleter');
  
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
    selectedElements.clear();
    if (e) {
      selectedElements.push(e);
    }
    updatePopup();
  }
  
  function getCurrentFeature() {
    if (selectedElements.getLength()) {
      return selectedElements.item(0);
    }
    return null;
  }

  edit_button.onclick = function() {
    let feature = getCurrentFeature();
    if (feature) {
      setPopupEditContent(feature);
    }
  }
  ok_button.onclick = function() {
    let feature = getCurrentFeature();
    if (feature) {
      setPopupDisplayContent(feature);
    }
  }

  delete_button.onclick = function() {
    let feature = getCurrentFeature();
    if (feature && confirm("Are you sure you want to delete?"))
    {
      setSelected(undefined);
      vector.getSource().removeFeature(feature);
      deleteContent(feature);
    }
  }
  
  closer.onclick = function () {
    setSelected(undefined);
    closer.blur();
    return false;
  };
  
  function updatePopup()
  {
    let feature = getCurrentFeature();
    if (feature) {
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
    edit_button.hidden = false;
    ok_button.hidden = true;
  
    var title = document.getElementById("title");
    var descr = document.getElementById("descr");
    
    title.hidden = feature.info.title === "";
    descr.hidden = feature.info.descr === "";

    // clear children
    while (title.firstChild)
    {
      title.firstChild.remove();
    }
    while (descr.firstChild)
    {
      descr.firstChild.remove();
    }
    title.appendChild(document.createTextNode(feature.info.title));
    descr.appendChild(document.createTextNode(feature.info.descr));
  }
  
  function setPopupEditContent(feature)
  {
    content_edit.hidden = false;
    content.hidden = true;
    edit_button.hidden = true;
    ok_button.hidden = false;
    
    var title = document.getElementById("title-edit");
    var descr = document.getElementById("descr-edit");
  
    title.focus();
  
    title.value = feature.info.title;
    descr.value = feature.info.descr;

    var saveDelayable = new DelayableFunc(()=>saveContent(feature));
  
    title.oninput = function() {
      feature.info.title = title.value;
      saveDelayable.delay(1000);
    };
  
    descr.oninput = function() {
      feature.info.descr = descr.value;
      saveDelayable.delay(1000);
    }
  }

  async function saveContent(e)
  {
    return fetch("modify_point", {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({...e.info, id: await e.info.id})
    })
  }

  async function deleteContent(e)
  {
    return fetch("delete_point", {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({id: await e.info.id})
    })
  }
  
  function DelayableFunc(func)
  {
    const run = timeout => setTimeout(func, timeout)
    this.handler = undefined
    this.delay = (timeout) => {
      clearTimeout(this.handler)
      this.handler = run(timeout)
    }
  }

  window.onkeydown = function(event) {
    if (event.key == 'Escape')
    {
      setSelected(undefined)
    }
  }

  fetch('get_points', {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }})
      .then((response) => response.json())
      .then((data) => {
        for (let point of data)
        {
          let feature = new Feature(new Point(point.coordinate));
          feature.info = {
            id: point.id,
            title: point.title,
            descr: point.descr,
          }
          vector.getSource().addFeature(feature);
        }
      });
}