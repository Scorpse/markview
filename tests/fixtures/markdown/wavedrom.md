# WaveDrom

A simple clocked bus transfer.

```wavedrom
{ signal: [
  { name: "clk",  wave: "p......" },
  { name: "req",  wave: "01..0.." },
  { name: "data", wave: "x.345x.", data: ["A", "B", "C"] }
]}
```

Malformed source must fall back to readable text:

```wavedrom
{ signal: [ this is not an object literal
```
