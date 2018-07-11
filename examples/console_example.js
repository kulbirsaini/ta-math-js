'use strict';
let TA = require('./ta-math');
const ohlcv = [[1527465600000,7338.99,7376.13,7333.88,7350,674.790009],
  [1527469200000,7350,7389.05,7301,7371.64,1059.501967],
  [1527472800000,7371,7372.84,7345.01,7366.1,610.967862],
  [1527476400000,7367.89,7437,7361.45,7374.98,1083.541187],
  [1527480000000,7374.99,7386.06,7287,7312.28,1763.293343],
  [1527483600000,7315,7352,7159.1,7185.58,3199.59748],
  [1527487200000,7189.58,7220.13,7165,7207.41,1703.366111],
  [1527490800000,7210.26,7248.65,7200,7215,1100.453159],
  [1527494400000,7220.45,7232.67,7189.99,7225.66,966.4607],
  [1527498000000,7222.27,7235.8,7200.04,7204.99,915.54118],
  [1527501600000,7204.95,7231.99,7198.67,7212.99,709.902109],
  [1527505200000,7213,7215.05,7178.18,7191.65,757.160088],
  [1527508800000,7196.74,7300,7148.16,7278.89,2115.416687],
  [1527512400000,7273,7280,7242,7259,738.289749],
  [1527516000000,7259,7275.88,7232.49,7249.8,913.486226],
  [1527519600000,7240.34,7263.11,7199,7220.12,808.264288],
  [1527523200000,7223.98,7243.39,7182.46,7194.01,1048.820742],
  [1527526800000,7195,7232.33,7175.23,7228.11,705.857516],
  [1527530400000,7228,7240,7195,7195.22,555.683562],
  [1527534000000,7195.22,7246.45,7188,7214.99,688.141612],
  [1527537600000,7215,7242.99,7192.62,7205.6,543.173421],
  [1527541200000,7205.32,7205.6,7120.16,7148,1401.118321],
  [1527544800000,7148,7150,7058.02,7131,2073.920058],
  [1527548400000,7131.99,7135,7084.3,7099,1082.691586],
  [1527552000000,7099,7132.1,7094.05,7116.4,952.303604]];
console.log(ohlcv);
let ta = TA(ohlcv);
console.log("sma", ta.sma(15));
console.log("ema", ta.ema(10));
console.log("std", ta.std(15));
console.log("bband", ta.bband(15));
console.log("macd", ta.macd(12,26,9));
console.log("zigzag", ta.zigzag(10));