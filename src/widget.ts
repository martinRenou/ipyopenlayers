// Copyright (c) QuantStack
// Distributed under the terms of the Modified BSD License.
import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
  unpack_models,
  ViewList,
} from '@jupyter-widgets/base';
import { TileLayerModel, TileLayerView } from './tilelayer';
import { BaseOverlayModel, BaseOverlayView } from './baseoverlay';

import { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import 'ol/ol.css';
import { MODULE_NAME, MODULE_VERSION } from './version';
import '../css/widget.css';
import { useGeographic } from 'ol/proj';

export * from './tilelayer';
const DEFAULT_LOCATION = [0.0, 0.0];

export class MapModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: MapModel.model_name,
      _model_module: MapModel.model_module,
      _model_module_version: MapModel.model_module_version,
      _view_name: MapModel.view_name,
      _view_module: MapModel.view_module,
      _view_module_version: MapModel.view_module_version,
      value: 'Hello World',
      layers: [],
      zoom: 2,
      center: DEFAULT_LOCATION,
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    layers: { deserialize: unpack_models },
    overlays: { deserialize: unpack_models },
    // Add any extra serializers here
  };

  static model_name = 'MapModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'MapView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}

export class MapView extends DOMWidgetView {
  render() {
    useGeographic();
    this.el.classList.add('custom-widget');

    this.mapContainer = document.createElement('div');
    this.mapContainer.style.height = '500px';
    this.el.appendChild(this.mapContainer);

    this.layerViews = new ViewList(
      this.addLayerModel,
      this.removeLayerView,
      this,
    );

    this.overlayViews = new ViewList<BaseOverlayView>(
      this.addOverlayModel,
      this.removeOverlayView,
      this,
    );
    this.map = new Map({
      target: this.mapContainer,
      view: new View({
        center: this.model.get('center'),
        zoom: this.model.get('zoom'),
      }),
      layers: [new TileLayer()],
    });

    this.layersChanged();
    this.model.on('change:layers', this.layersChanged, this);
    this.model.on('change:overlays', this.overlayChanged, this);
    this.model.on('change:zoom', this.zoomChanged, this);
    this.model.on('change:center', this.centerChanged, this);
  }

  layersChanged() {
    const layers = this.model.get('layers') as TileLayerModel[];
    this.layerViews.update(layers);
  }

  overlayChanged() {
    const overlay = this.model.get('overlays') as BaseOverlayModel[];
    this.overlayViews.update(overlay);
  }

  zoomChanged() {
    const newZoom = this.model.get('zoom');
    if (newZoom !== undefined && newZoom !== null) {
      this.map.getView().setZoom(newZoom);
    }
  }

  centerChanged() {
    const newCenter = this.model.get('center');
    if (newCenter !== undefined && newCenter !== null) {
      this.map.getView().setCenter(newCenter);
    }
  }

  removeLayerView(child_view: TileLayerView) {
    this.map.removeLayer(child_view.tileLayer);
    child_view.remove();
  }

  removeOverlayView(child_view: BaseOverlayView) {
    if (child_view.overlay) {
      this.map.removeOverlay(child_view.overlay);
    }
    child_view.remove();
  }

  async addLayerModel(child_model: TileLayerModel) {
    const view = await this.create_child_view<TileLayerView>(child_model, {
      map_view: this,
    });
    this.map.addLayer(view.tileLayer);
    this.displayed.then(() => {
      view.trigger('displayed', this);
    });
    return view;
  }

  async addOverlayModel(child_model: BaseOverlayModel) {
    const view = await this.create_child_view<BaseOverlayView>(child_model, {
      map_view: this,
    });
    this.map.addOverlay(view.overlay);
    this.displayed.then(() => {
      view.trigger('displayed', this);
    });
    return view;
  }

  imageElement: HTMLImageElement;
  mapContainer: HTMLDivElement;
  map: Map;
  layerViews: ViewList<TileLayerView>;
  overlayViews: ViewList<BaseOverlayView>;
}
