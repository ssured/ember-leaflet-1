import Ember from 'ember';
import layout from '../templates/popup';
const { computed, observer, Mixin, run: { schedule }, $: {extend} } = Ember;

export default Mixin.create({

  // we need a "tagfull" here to have `this.element`
  tagName: 'div',

  layout,
  popupOpen: false,

  /*
   * Evil hack by @rwjblue.
   * `hasBlock` isn't available in js land.
   * More info: https://github.com/miguelcobain/rfcs/blob/js-has-block/text/0000-js-has-block.md#alternatives
   */
  setHasBlock: computed(function() {
    this.set('hasBlock', true);
  }),

  // creates a document fragment that will hold the DOM
  destinationElement: computed(function() {
    return document.createElement('div');
  }),

  popupOpenDidChange: observer('popupOpen', function() {
    // compares the state to the previous known state
    // if it changes, then act accordingly
    // this code protects for firing more than once
    let popupOpen = this.get('popupOpen');
    if (this._popupOpen !== popupOpen) {
      if (popupOpen) {
        this._layer.openPopup();
        // notify possible content change
        schedule('afterRender', () => {
          this._popup.update();
        });
      }
      else {
        this._layer.closePopup();
      }
      this._popupOpen = popupOpen;
    }
  }),

  willInsertElement() {
    this._super(...arguments);
    this._firstNode = this.element.firstChild;
    this._lastNode = this.element.lastChild;
    this.appendToDestination();
  },

  appendToDestination() {
    let destinationElement = this.get('destinationElement');
    this.appendRange(destinationElement, this._firstNode, this._lastNode);
  },

  appendRange(destinationElement, firstNode, lastNode) {
    while(firstNode) {
      destinationElement.insertBefore(firstNode, null);
      firstNode = firstNode !== lastNode ? lastNode.parentNode.firstChild : null;
    }
  },

  didCreateLayer() {
    this._super(...arguments);
    if (this.get('hasBlock')) {
      this._popup = this.L.popup(extend({
        // can be removed once https://github.com/Leaflet/Leaflet/pull/4188 is merged
        closeOnClick: true
      }, this.get('popupOptions') || {}), this._layer);
      this._popup.setContent(this.get('destinationElement'));
      this._layer.bindPopup(this._popup);

      this._hijackPopup();

      this.popupOpenDidChange();
    }
  },

  _hijackPopup() {
    let oldOnAdd = this._popup.onAdd;
    this._popup.onAdd = (map) => {
      oldOnAdd.call(this._popup, map);
      this.set('popupOpen', true);
    };

    let oldOnRemove = this._popup.onRemove;
    this._popup.onRemove = (map) => {
      this.set('popupOpen', false);
      oldOnRemove.call(this._popup, map);
    };
  },

  willDestroyLayer() {
    this._super(...arguments);
    if (this.get('hasBlock')) {
      // if (this._popupOpen) {
        this._layer.closePopup();
      // }
      this._layer.unbindPopup();
      delete this._popup;
      delete this._firstNode;
      delete this._lastNode;
    }
  }
});
