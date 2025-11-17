# Map Image

Place your Lumiose City map image here as `lumiose_map.png`.

## Finding the Map Image

You can:
1. Extract it from game files
2. Use screenshots stitched together
3. Find a high-quality fan-made map online

## Image Requirements

- High resolution (recommended: at least 2000x2000px)
- Clean, top-down view
- PNG or JPG format
- Name it: `lumiose_map.png`

Once you have the image, update the `mapBounds` in `js/map.js` to match the image dimensions:

```javascript
mapBounds: [[0, 0], [imageHeight, imageWidth]]
```
