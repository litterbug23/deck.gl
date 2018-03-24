// Copyright (c) 2015 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import {CompositeLayer} from 'deck.gl';
import MultiIconLayer from '../text-layer/multi-icon-layer/multi-icon-layer';

const DEFAULT_COLOR = [0, 0, 0, 255];
const TEXT_ANCHOR = {
  start: 1,
  middle: 0,
  end: -1
};
const ALIGNMENT_BASELINE = {
  top: 1,
  center: 0,
  bottom: -1
};

const defaultProps = {
  getText: x => x.text,
  getPosition: x => x.coordinates,
  getColor: x => x.color || DEFAULT_COLOR,
  getSize: x => x.size || 32,
  getAngle: x => x.angle || 0,
  getTextAnchor: x => x.textAnchor || 'middle',
  getAlignmentBaseline: x => x.alignmentBaseline || 'center',
  getPixelOffset: x => x.pixelOffset || [0, 0],
  fp64: false
};

export default class AdvancedTextLayer extends CompositeLayer {
  initializeState() {
    const {gl} = this.context;
    this.state = {
      iconAtlas: this.props.fontTexture,
      iconMapping: null
    };

    fetch(this.props.fontInfo).then(response => {
      response.json().then(json => {
        const iconMapping = {};
        json.forEach(({charid, x, y, width, height}) => {
          iconMapping[String.fromCharCode(charid)] = {
            x, y, width, height, mask:true
          };
        });
        this.setState({iconMapping});
      });
    });
  }

  updateState({props, oldProps, changeFlags}) {
    if (
      changeFlags.dataChanged ||
      (changeFlags.updateTriggersChanged &&
        (changeFlags.updateTriggersChanged.all ||
          changeFlags.updateTriggersChanged.getText ||
          changeFlags.updateTriggersChanged.getPosition))
    ) {
      this.transformStringToLetters();
    }
  }

  transformStringToLetters() {
    const {data, getText, getPosition} = this.props;
    if (!data || data.length === 0) {
      return;
    }

    const transformedData = data
      .map(val => {
        const text = getText(val);
        const letters = Array.from(text);
        const position = getPosition(val);
        if (!text) {
          return [];
        }
        return letters.map((letter, i) =>
          Object.assign({}, val, {text: letter, position, index: i, len: text.length})
        );
      })
      .reduce((prev, curr) => [...prev, ...curr]);

    this.setState({data: transformedData});
  }

  getAnchorXFromTextAnchor(textAnchor) {
    if (!TEXT_ANCHOR.hasOwnProperty(textAnchor)) {
      throw new Error(`Invalid text anchor parameter: ${textAnchor}`);
    }
    return TEXT_ANCHOR[textAnchor];
  }

  getAnchorYFromAlignmentBaseline(alignmentBaseline) {
    if (!ALIGNMENT_BASELINE.hasOwnProperty(alignmentBaseline)) {
      throw new Error(`Invalid alignment baseline parameter: ${alignmentBaseline}`);
    }
    return ALIGNMENT_BASELINE[alignmentBaseline];
  }

  renderLayers() {
    const {data, iconAtlas, iconMapping} = this.state;

    if (!iconMapping || !iconAtlas || !data) {
      return null;
    }

    const {
      getColor,
      getSize,
      getAngle,
      getTextAnchor,
      getAlignmentBaseline,
      getPixelOffset,
      fp64,
      sizeScale
    } = this.props;

    return [
      new MultiIconLayer(
        this.getSubLayerProps({
          id: 'adv-text-multi-icon-layer',
          data,
          iconAtlas,
          iconMapping,
          getIcon: d => d.text,
          getPosition: d => d.position,
          getIndexOfIcon: d => d.index,
          getNumOfIcon: d => d.len,
          getColor,
          getSize,
          getAngle,
          getAnchorX: d => this.getAnchorXFromTextAnchor(getTextAnchor(d)),
          getAnchorY: d => this.getAnchorYFromAlignmentBaseline(getAlignmentBaseline(d)),
          getPixelOffset,
          fp64,
          sizeScale,
          updateTriggers: {
            getAngle,
            getColor,
            getSize
          }
        })
      )
    ];
  }
}

AdvancedTextLayer.layerName = 'AdvancedTextLayer';
AdvancedTextLayer.defaultProps = defaultProps;
