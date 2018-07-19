import { pointwise } from './core';
import { ema, sma } from './overlays';

export function macd($close, wshort, wlong, wsig) {
  const macd_line = pointwise(ema($close, wshort), ema($close, wlong), (a, b) => a - b);
  const macd_signal = ema(macd_line, wsig);
  const macd_hist = pointwise(macd_line, macd_signal, (a, b) => a - b);
  return [macd_line, macd_signal, macd_hist];
}

export function rsi($close, window) {
  let gains = [1e-14], loss = [0];
  for (let i = 1; i < $close.length; i++) {
    let diff = $close[i] - $close[i - 1];
    gains.push(diff >= 0 ? diff : 0);
    loss.push(diff < 0 ? -diff : 0);
  }
  return pointwise(sma(gains), sma(loss), (a, b) => 100 - 100 / (1 + a / b));
}