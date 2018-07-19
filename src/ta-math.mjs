import * as indicators from './indicators';
import * as overlays from './overlays';

/**
 * Class for calculating technical analysis indicators and overlays
 */
export default class TA {
  constructor(data, getter = null) {
    
    let defaultGetter = (x) => {
      return {
        length: x.length,
        time: (i) => x[i][0],
        open: (i) => x[i][1],
        high: (i) => x[i][2],
        low: (i) => x[i][3],
        close: (i) => x[i][4],
        volume: (i) => x[i][5]
      }
    };
    this.getter = (getter == null) ? defaultGetter : getter;

    let proxy = (prop) => new Proxy(this.getter(data)[prop], {
      get: (obj, key) => {
        if(key == 'length') {                 //length
          return this.getter(data).length;
        } else if (key == 'slice') {          //slice
          return (start, end) => {
            var result = [];
            for (var i = start; i < end; i++) { result.push(obj(i)); }
            return result;
          }
        } else {
          try {
            if (key === parseInt(key).toString()) {   //operator[]
              return obj(key);
            }
          } catch(er) {}
        }
      }
    });

    this.$ = ['time', 'open', 'high', 'low', 'close', 'volume'];
    this.$.forEach(prop => this.$[prop] = proxy(prop));


    /* TECHNICAL ANALYSYS METHOD DEFENITION */

    return {
      sma:    (window = 15)                           =>    overlays.sma(this.$.close, window),
      ema:    (window = 10)                           =>    overlays.ema(this.$.close, window),
      std:    (window = 15)                           =>    overlays.std(this.$.close, window),
      bband:  (window = 15, mult = 2)                 =>    overlays.bband(this.$.close, window, mult),
      macd:   (wshort = 12, wlong = 26, wsig = 9)     =>    indicators.macd(this.$.close, wshort, wlong, wsig),
      rsi:    (window = 14)                           =>    indicators.rsi(this.$.close, window),
      vbp:    (zones = 12, left = 0, right = null)    =>    overlays.vbp(this.$.close, $.volume, zones, left, right),
      zigzag: (percent = 15)                          =>    overlays.zigzag(this.$.time, $.high, $.low, percent)
    }
  }
}