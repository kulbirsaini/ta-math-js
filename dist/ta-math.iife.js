var TA = (function () {
  'use strict';

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var toConsumableArray = function (arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    } else {
      return Array.from(arr);
    }
  };

  /* basic math */

  function mean(series) {
    var sum = 0;
    for (var i = 0; i < series.length; i++) {
      sum += series[i];
    }
    return sum / series.length;
  }

  function sd(series) {
    return rmse(series, new Array(series.length).fill(mean(series)));
  }

  function mad(array) {
    return mae(array, new Array(array.length).fill(mean(array)));
  }

  /* scaled and percentage errors */

  function mae(f, g) {
    var absDiff = pointwise(function (a, b) {
      return Math.abs(a - b);
    }, f, g);
    return f.length != g.length ? Infinity : mean(absDiff);
  }

  function rmse(f, g) {
    var sqrDiff = pointwise(function (a, b) {
      return (a - b) * (a - b);
    }, f, g);
    return f.length != g.length ? Infinity : Math.sqrt(mean(sqrDiff));
  }

  /* functional programming */

  function pointwise(operation) {
    for (var _len = arguments.length, serieses = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      serieses[_key - 1] = arguments[_key];
    }

    var result = [];
    for (var i = 0, len = serieses[0].length; i < len; i++) {
      var iseries = function iseries(i) {
        return serieses.map(function (x) {
          return x[i];
        });
      };
      result[i] = operation.apply(undefined, toConsumableArray(iseries(i)));
    }
    return result;
  }

  function rolling(operation, window, series) {
    var result = [];
    for (var i = 0, len = series.length; i < len; i++) {
      var j = i + 1 - window;
      result.push(operation(series.slice(j > 0 ? j : 0, i + 1)));
    }
    return result;
  }

  /* core indicators & overlays */

  function sma(series, window) {
    return rolling(function (x) {
      return mean(x);
    }, window, series);
  }

  function ema(series, window) {
    var weight = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var start = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    weight = weight ? weight : 2 / (window + 1);
    var ema = [start ? start : mean(series.slice(0, window))];
    for (var i = 1, len = series.length; i < len; i++) {
      ema.push(series[i] * weight + (1 - weight) * ema[i - 1]);
    }
    return ema;
  }

  function stdev(series, window) {
    return rolling(function (x) {
      return sd(x);
    }, window, series);
  }

  function madev(series, window) {
    return rolling(function (x) {
      return mad(x);
    }, window, series);
  }

  function expdev(series, window) {
    var sqrDiff = pointwise(function (a, b) {
      return (a - b) * (a - b);
    }, series, ema(series, window));
    return pointwise(function (x) {
      return Math.sqrt(x);
    }, ema(sqrDiff, window));
  }

  function atr($high, $low, $close, window) {
    var tr = trueRange($high, $low, $close);
    return ema(tr, window, 1 / window);
  }

  /* price transformations */

  function typicalPrice($high, $low, $close) {
    return pointwise(function (a, b, c) {
      return (a + b + c) / 3;
    }, $high, $low, $close);
  }

  function trueRange($high, $low, $close) {
    var tr = [$high[0] - $low[0]];
    for (var i = 1, len = $low.length; i < len; i++) {
      tr.push(Math.max($high[i] - $low[i], Math.abs($high[i] - $close[i - 1]), Math.abs($low[i] - $close[i - 1])));
    }
    return tr;
  }

  /* indicators */

  function macd($close, wshort, wlong, wsig) {
    var line = pointwise(function (a, b) {
      return a - b;
    }, ema($close, wshort), ema($close, wlong));
    var signal = ema(line, wsig);
    var hist = pointwise(function (a, b) {
      return a - b;
    }, line, signal);
    return { line: line, signal: signal, hist: hist };
  }

  function rsi($close, window) {
    var gains = [0],
        loss = [1e-14];
    for (var i = 1, len = $close.length; i < len; i++) {
      var diff = $close[i] - $close[i - 1];
      gains.push(diff >= 0 ? diff : 0);
      loss.push(diff < 0 ? -diff : 0);
    }
    return pointwise(function (a, b) {
      return 100 - 100 / (1 + a / b);
    }, ema(gains, window, 1 / window), ema(loss, window, 1 / window));
  }

  function mfi($high, $low, $close, $volume, window) {
    var pmf = [0],
        nmf = [0];
    var tp = typicalPrice($high, $low, $close);
    for (var i = 1, len = $close.length; i < len; i++) {
      var diff = tp[i] - tp[i - 1];
      pmf.push(diff >= 0 ? tp[i] * $volume[i] : 0);
      nmf.push(diff < 0 ? tp[i] * $volume[i] : 0);
    }
    pmf = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, pmf);
    nmf = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, nmf);
    return pointwise(function (a, b) {
      return 100 - 100 / (1 + a / b);
    }, pmf, nmf);
  }

  function stoch($high, $low, $close, window, signal, smooth) {
    var lowest = rolling(function (x) {
      return Math.min.apply(Math, toConsumableArray(x));
    }, window, $low);
    var highest = rolling(function (x) {
      return Math.max.apply(Math, toConsumableArray(x));
    }, window, $high);
    var K = pointwise(function (h, l, c) {
      return 100 * (c - l) / (h - l);
    }, highest, lowest, $close);
    if (smooth > 1) {
      K = sma(K, smooth);
    }
    return { line: K, signal: sma(K, signal) };
  }

  function stochRsi($close, window, signal, smooth) {
    var _rsi = rsi($close, window);
    var extreme = rolling(function (x) {
      return { low: Math.min.apply(Math, toConsumableArray(x)), high: Math.max.apply(Math, toConsumableArray(x)) };
    }, window, _rsi);
    var K = pointwise(function (rsi, e) {
      return (rsi - e.low) / (e.high - e.low);
    }, _rsi, extreme);
    K[0] = 0;if (smooth > 1) {
      K = sma(K, smooth);
    }
    return { line: K, signal: sma(K, signal) };
  }

  function vi($high, $low, $close, window) {
    var pv = [($high[0] - $low[0]) / 2],
        nv = [pv[0]];
    for (var i = 1, len = $high.length; i < len; i++) {
      pv.push(Math.abs($high[i] - $low[i - 1]));
      nv.push(Math.abs($high[i - 1] - $low[i]));
    }
    var apv = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, pv);
    var anv = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, nv);
    var atr$$1 = rolling(function (x) {
      return x.reduce(function (sum, x) {
        return sum + x;
      }, 0);
    }, window, trueRange($high, $low, $close));
    return { plus: pointwise(function (a, b) {
        return a / b;
      }, apv, atr$$1), minus: pointwise(function (a, b) {
        return a / b;
      }, anv, atr$$1) };
  }

  function cci($high, $low, $close, window, mult) {
    var tp = typicalPrice($high, $low, $close);
    var tpsma = sma(tp, window);
    var tpmad = madev(tp, window);
    tpmad[0] = Infinity;
    return pointwise(function (a, b, c) {
      return (a - b) / (c * mult);
    }, tp, tpsma, tpmad);
  }

  function obv($close, $volume, signal) {
    var obv = [0];
    for (var i = 1, len = $close.length; i < len; i++) {
      obv.push(obv[i - 1] + Math.sign($close[i] - $close[i - 1]) * $volume[i]);
    }
    return { line: obv, signal: sma(obv, signal) };
  }

  function adl($high, $low, $close, $volume) {
    var adl = [$volume[0] * (2 * $close[0] - $low[0] - $high[0]) / ($high[0] - $low[0])];
    for (var i = 1, len = $high.length; i < len; i++) {
      adl[i] = adl[i - 1] + $volume[i] * (2 * $close[i] - $low[i] - $high[i]) / ($high[i] - $low[i]);
    }
    return adl;
  }

  function roc($close, window) {
    return rolling(function (x) {
      return 100 * (x[x.length - 1] - x[0]) / x[0];
    }, window, $close);
  }

  function williams($high, $low, $close, window) {
    return pointwise(function (x) {
      return x - 100;
    }, stoch($high, $low, $close, window, 1, 1).line);
  }

  /* overlays */

  function dema($close, window) {
    var ema1 = ema($close, window);
    return pointwise(function (a, b) {
      return 2 * a - b;
    }, ema1, ema(ema1, window));
  }

  function tema($close, window) {
    var ema1 = ema($close, window);
    var ema2 = ema(ema1, window);
    return pointwise(function (a, b, c) {
      return 3 * a - 3 * b + c;
    }, ema1, ema2, ema(ema2, window));
  }

  function bb($close, window, mult) {
    var ma = sma($close, window);
    var dev = stdev($close, window);
    var upper = pointwise(function (a, b) {
      return a + b * mult;
    }, ma, dev);
    var lower = pointwise(function (a, b) {
      return a - b * mult;
    }, ma, dev);
    return { lower: lower, middle: ma, upper: upper };
  }

  function ebb($close, window, mult) {
    var ma = ema($close, window);
    var dev = expdev($close, window);
    var upper = pointwise(function (a, b) {
      return a + b * mult;
    }, ma, dev);
    var lower = pointwise(function (a, b) {
      return a - b * mult;
    }, ma, dev);
    return { lower: lower, middle: ma, upper: upper };
  }

  function psar($high, $low, stepfactor, maxfactor) {
    var isUp = true;
    var factor = stepfactor;
    var extreme = Math.max($high[0], $high[1]);
    var psar = [$low[0], Math.min($low[0], $low[1])];
    var cursar = psar[1];
    for (var i = 2, len = $high.length; i < len; i++) {
      cursar = cursar + factor * (extreme - cursar);
      if (isUp && $high[i] > extreme || !isUp && $low[i] < extreme) {
        factor = factor <= maxfactor ? factor + stepfactor : maxfactor;
        extreme = isUp ? $high[i] : $low[i];
      }
      if (isUp && $low[i] < cursar || !isUp && cursar > $high[i]) {
        isUp = !isUp;
        factor = stepfactor;
        cursar = isUp ? Math.min.apply(Math, toConsumableArray($low.slice(i - 2, i + 1))) : Math.max.apply(Math, toConsumableArray($high.slice(i - 2, i + 1)));
      }
      //console.log(`isUp=${isUp}, c=${$low[i]}, extreme=${extreme.toFixed(2)}, factor=${factor}, sar=${cursar.toFixed(2)}`);
      psar.push(cursar);
    }
    return psar;
  }

  function vbp($close, $volume, zones, left, right) {
    var total = 0;
    var bottom = Infinity;
    var top = -Infinity;
    var vbp = new Array(zones).fill(0);
    right = !isNaN(right) ? right : $close.length;
    for (var i = left; i < right; i++) {
      total += $volume[i];
      top = top < $close[i] ? $close[i] : top;
      bottom = bottom > $close[i] ? $close[i] : bottom;
    }
    for (var _i = left; _i < right; _i++) {
      vbp[Math.floor(($close[_i] - bottom) / (top - bottom) * (zones - 1))] += $volume[_i];
    }
    return { bottom: bottom, top: top, volumes: vbp.map(function (x) {
        return x / total;
      }) };
  }

  function keltner($high, $low, $close, window, mult) {
    var middle = ema($close, window);
    var upper = pointwise(function (a, b) {
      return a + mult * b;
    }, middle, atr($high, $low, $close, window));
    var lower = pointwise(function (a, b) {
      return a - mult * b;
    }, middle, atr($high, $low, $close, window));
    return { lower: lower, middle: middle, upper: upper };
  }

  function vwap($high, $low, $close, $volume) {
    var tp = typicalPrice($high, $low, $close),
        cumulVTP = [$volume[0] * tp[0]],
        cumulV = [$volume[0]];
    for (var i = 1, len = $close.length; i < len; i++) {
      cumulVTP[i] = cumulVTP[i - 1] + $volume[i] * tp[i];
      cumulV[i] = cumulV[i - 1] + $volume[i];
    }
    return pointwise(function (a, b) {
      return a / b;
    }, cumulVTP, cumulV);
  }

  function zigzag($time, $high, $low, percent) {
    var lowest = $low[0],
        thattime = $time[0],
        isUp = false;
    var highest = $high[0],
        time = [],
        zigzag = [];
    for (var i = 1, len = $time.length; i < len; i++) {
      if (isUp) {
        if ($high[i] > highest) {
          thattime = $time[i];highest = $high[i];
        } else if ($low[i] < lowest + (highest - lowest) * (100 - percent) / 100) {
          isUp = false;time.push(thattime);zigzag.push(highest);lowest = $low[i];
        }
      } else {
        if ($low[i] < lowest) {
          thattime = $time[i];lowest = $low[i];
        } else if ($high[i] > lowest + (highest - lowest) * percent / 100) {
          isUp = true;time.push(thattime);zigzag.push(lowest);highest = $high[i];
        }
      }
    }
    return { time: time, price: zigzag };
  }

  /* data formats */

  var simpleFormat = function simpleFormat(x) {
    return {
      length: x[4].length,
      time: function time(i) {
        return x[0][i];
      },
      open: function open(i) {
        return x[1][i];
      },
      high: function high(i) {
        return x[2][i];
      },
      low: function low(i) {
        return x[3][i];
      },
      close: function close(i) {
        return x[4][i];
      },
      volume: function volume(i) {
        return x[5][i];
      }
    };
  };

  var exchangeFormat = function exchangeFormat(x) {
    return {
      length: x.length,
      time: function time(i) {
        return x[i][0];
      },
      open: function open(i) {
        return x[i][1];
      },
      high: function high(i) {
        return x[i][2];
      },
      low: function low(i) {
        return x[i][3];
      },
      close: function close(i) {
        return x[i][4];
      },
      volume: function volume(i) {
        return x[i][5];
      }
    };
  };

  var objectFormat = function objectFormat(x) {
    return {
      length: x.close.length,
      time: function time(i) {
        return x.time[i];
      },
      open: function open(i) {
        return x.open[i];
      },
      high: function high(i) {
        return x.high[i];
      },
      low: function low(i) {
        return x.low[i];
      },
      close: function close(i) {
        return x.close[i];
      },
      volume: function volume(i) {
        return x.volume[i];
      }
    };
  };

  /**
   * Class for calculating technical analysis indicators and overlays
   */

  var TA = function () {
    function TA(ohlcv, format) {
      classCallCheck(this, TA);

      this.ohlcv = ohlcv;
      this.format = format === undefined ? TA.exchangeFormat : format;
    }

    /* price getters */


    createClass(TA, [{
      key: 'initGetter',
      value: function initGetter(name) {
        var result = [],
            length = this.format(this.ohlcv)['length'];
        for (var i = 0; i < length; i++) {
          result.push(this.format(this.ohlcv)[name](i));
        }
        this[name] = result;
        return result;
      }
    }, {
      key: 'sma',


      /* member defenition of technical analysis methods */
      value: function sma$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return TA.sma(this.$close, window);
      }
    }, {
      key: 'ema',
      value: function ema$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
        return TA.ema(this.$close, window);
      }
    }, {
      key: 'dema',
      value: function dema$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
        return TA.dema(this.$close, window);
      }
    }, {
      key: 'tema',
      value: function tema$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
        return TA.tema(this.$close, window);
      }
    }, {
      key: 'bb',
      value: function bb$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        var mult = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
        return TA.bb(this.$close, window, mult);
      }
    }, {
      key: 'ebb',
      value: function ebb$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
        var mult = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
        return TA.ebb(this.$close, window, mult);
      }
    }, {
      key: 'psar',
      value: function psar$$1() {
        var factor = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0.02;
        var maxfactor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.2;
        return TA.psar(this.$high, this.$low, factor, maxfactor);
      }
    }, {
      key: 'vbp',
      value: function vbp$$1() {
        var zones = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 12;
        var left = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var right = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : NaN;
        return TA.vbp(this.$close, this.$volume, zones, left, right);
      }
    }, {
      key: 'keltner',
      value: function keltner$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        var mult = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
        return TA.keltner(this.$high, this.$low, this.$close, window, mult);
      }
    }, {
      key: 'vwap',
      value: function vwap$$1() {
        return TA.vwap(this.$high, this.$low, this.$close, this.$volume);
      }
    }, {
      key: 'zigzag',
      value: function zigzag$$1() {
        var percent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return TA.zigzag(this.$time, this.$high, this.$low, percent);
      }
    }, {
      key: 'stdev',
      value: function stdev$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return TA.stdev(this.$close, window);
      }
    }, {
      key: 'madev',
      value: function madev$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return TA.madev(this.$close, window);
      }
    }, {
      key: 'expdev',
      value: function expdev$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
        return TA.expdev(this.$close, window);
      }
    }, {
      key: 'macd',
      value: function macd$$1() {
        var wshort = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 12;
        var wlong = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 26;
        var wsig = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 9;
        return TA.macd(this.$close, wshort, wlong, wsig);
      }
    }, {
      key: 'rsi',
      value: function rsi$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return TA.rsi(this.$close, window);
      }
    }, {
      key: 'mfi',
      value: function mfi$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return TA.mfi(this.$high, this.$low, this.$close, this.$volume, window);
      }
    }, {
      key: 'stoch',
      value: function stoch$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        var signal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3;
        var smooth = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
        return TA.stoch(this.$high, this.$low, this.$close, window, signal, smooth);
      }
    }, {
      key: 'stochRsi',
      value: function stochRsi$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        var signal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 3;
        var smooth = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
        return TA.stochRsi(this.$close, window, signal, smooth);
      }
    }, {
      key: 'vi',
      value: function vi$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return TA.vi(this.$high, this.$low, this.$close, window);
      }
    }, {
      key: 'cci',
      value: function cci$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 20;
        var mult = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.015;
        return TA.cci(this.$high, this.$low, this.$close, window, mult);
      }
    }, {
      key: 'obv',
      value: function obv$$1() {
        var signal = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;
        return TA.obv(this.$close, this.$volume, signal);
      }
    }, {
      key: 'adl',
      value: function adl$$1() {
        return TA.adl(this.$high, this.$low, this.$close, this.$volume);
      }
    }, {
      key: 'atr',
      value: function atr$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return TA.atr(this.$high, this.$low, this.$close, window);
      }
    }, {
      key: 'williams',
      value: function williams$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return TA.williams(this.$high, this.$low, this.$close, window);
      }
    }, {
      key: 'roc',
      value: function roc$$1() {
        var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 14;
        return TA.roc(this.$close, window);
      }
    }, {
      key: '$time',
      get: function get$$1() {
        return this.time === undefined ? this.initGetter('time') : this.time;
      }
    }, {
      key: '$open',
      get: function get$$1() {
        return this.open === undefined ? this.initGetter('open') : this.open;
      }
    }, {
      key: '$high',
      get: function get$$1() {
        return this.high === undefined ? this.initGetter('high') : this.high;
      }
    }, {
      key: '$low',
      get: function get$$1() {
        return this.low === undefined ? this.initGetter('low') : this.low;
      }
    }, {
      key: '$close',
      get: function get$$1() {
        return this.close === undefined ? this.initGetter('close') : this.close;
      }
    }, {
      key: '$volume',
      get: function get$$1() {
        return this.volume === undefined ? this.initGetter('volume') : this.volume;
      }

      /* formats */

    }], [{
      key: 'sma',


      /* static defenition of technical analysis methods */
      value: function sma$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 15;
        return sma($close, window);
      }
    }, {
      key: 'ema',
      value: function ema$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
        return ema($close, window);
      }
    }, {
      key: 'dema',
      value: function dema$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
        return dema($close, window);
      }
    }, {
      key: 'tema',
      value: function tema$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
        return tema($close, window);
      }
    }, {
      key: 'bb',
      value: function bb$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 15;
        var mult = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2;
        return bb($close, window, mult);
      }
    }, {
      key: 'ebb',
      value: function ebb$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 10;
        var mult = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 2;
        return ebb($close, window, mult);
      }
    }, {
      key: 'psar',
      value: function psar$$1($high, $low) {
        var factor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0.02;
        var maxfactor = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0.2;
        return psar($high, $low, factor, maxfactor);
      }
    }, {
      key: 'vbp',
      value: function vbp$$1($close, $volume) {
        var zones = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 12;
        var left = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
        var right = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : NaN;
        return vbp($close, $volume, zones, left, right);
      }
    }, {
      key: 'keltner',
      value: function keltner$$1($high, $low, $close) {
        var window = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 14;
        var mult = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 2;
        return keltner($high, $low, $close, window, mult);
      }
    }, {
      key: 'vwap',
      value: function vwap$$1($high, $low, $close, $volume) {
        return vwap($high, $low, $close, $volume);
      }
    }, {
      key: 'zigzag',
      value: function zigzag$$1($time, $high, $low) {
        var percent = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 15;
        return zigzag($time, $high, $low, percent);
      }
    }, {
      key: 'stdev',
      value: function stdev$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 15;
        return stdev($close, window);
      }
    }, {
      key: 'madev',
      value: function madev$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 15;
        return madev($close, window);
      }
    }, {
      key: 'expdev',
      value: function expdev$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 15;
        return expdev($close, window);
      }
    }, {
      key: 'macd',
      value: function macd$$1($close) {
        var wshort = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 12;
        var wlong = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 26;
        var wsig = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 9;
        return macd($close, wshort, wlong, wsig);
      }
    }, {
      key: 'rsi',
      value: function rsi$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 14;
        return rsi($close, window);
      }
    }, {
      key: 'mfi',
      value: function mfi$$1($high, $low, $close, $volume) {
        var window = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 14;
        return mfi($high, $low, $close, $volume, window);
      }
    }, {
      key: 'stoch',
      value: function stoch$$1($high, $low, $close) {
        var window = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 14;
        var signal = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 3;
        var smooth = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1;
        return stoch($high, $low, $close, window, signal, smooth);
      }
    }, {
      key: 'stochRsi',
      value: function stochRsi$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 14;
        var signal = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 3;
        var smooth = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
        return stochRsi($close, window, signal, smooth);
      }
    }, {
      key: 'vi',
      value: function vi$$1($high, $low, $close) {
        var window = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 14;
        return vi($high, $low, $close, window);
      }
    }, {
      key: 'cci',
      value: function cci$$1($high, $low, $close) {
        var window = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 20;
        var mult = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 0.015;
        return cci($high, $low, $close, window, mult);
      }
    }, {
      key: 'obv',
      value: function obv$$1($close, $volume) {
        var signal = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 10;
        return obv($close, $volume, signal);
      }
    }, {
      key: 'adl',
      value: function adl$$1($high, $low, $close, $volume) {
        return adl($high, $low, $close, $volume);
      }
    }, {
      key: 'atr',
      value: function atr$$1($high, $low, $close) {
        var window = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 14;
        return atr($high, $low, $close, window);
      }
    }, {
      key: 'williams',
      value: function williams$$1($high, $low, $close) {
        var window = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 14;
        return williams($high, $low, $close, window);
      }
    }, {
      key: 'roc',
      value: function roc$$1($close) {
        var window = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 14;
        return roc($close, window);
      }
    }, {
      key: 'simpleFormat',
      get: function get$$1() {
        return simpleFormat;
      }
    }, {
      key: 'exchangeFormat',
      get: function get$$1() {
        return exchangeFormat;
      }
    }, {
      key: 'objectFormat',
      get: function get$$1() {
        return objectFormat;
      }
    }]);
    return TA;
  }();

  return TA;

}());