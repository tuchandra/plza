# Game8 Map Investigation - Nov 17, 2025

## Goal
Investigate using game8's map tiles instead of Serebii for better labels and colors.

## Findings

### Game8 Map Source
URL: `https://assets.game8.jp/uploads/qQ7DyvPf1ZI74YbGcrhwShN8ekVb3v.jpg`

**Specifications:**
- Format: JPEG
- Dimensions: 4901×4901 pixels
- File size: 2.3 MB
- Quality: High resolution (4.8× larger than our current map)

### Comparison vs Serebii

**Game8 map:**
- ✅ Much higher resolution (4901×4901 vs 1024×1024)
- ✅ Similar visual style and color scheme
- ❌ Green spawn radius circles baked into the image
- ❌ **No text labels for districts or streets**
- ❌ Large file size (2.3 MB vs 897 KB)

**Serebii map:**
- ✅ Smaller file size (897 KB PNG)
- ✅ Clean base map without overlays
- ✅ Already integrated with correct coordinate system
- ❌ Lower resolution (1024×1024)
- ❌ No text labels either

### Why Game8 Map Is Not Suitable

1. **Baked-in overlays conflict with our features**
   - Green circles show spawn radiuses
   - Would clash with our dynamic bench/fly point radius circles
   - Can't toggle or customize these overlays

2. **No text labels anyway**
   - Main goal was to get district/street labels
   - Game8 map doesn't have these either
   - Same minimal labeling as Serebii

3. **Performance impact**
   - 2.3 MB JPEG vs 897 KB PNG
   - 2.6× larger file size
   - Slower initial page load
   - Higher bandwidth usage

4. **Coordinate alignment unknown**
   - Would need to verify coordinate system matches
   - Might require rescaling all 1,063+ markers
   - Risk of misalignment issues

## Decision

**Rejected** - Keep using Serebii map.

The game8 map provides no advantage for our use case:
- No text labels (our main goal)
- Unwanted baked-in overlays
- Significantly larger file size
- Adds complexity without benefits

## Alternative Approaches for Labels

If we want to add labels in the future:

### Option 1: Separate Leaflet Text Overlay
```typescript
// Add text labels as Leaflet markers/tooltips
L.marker([lat, lng], {
  icon: L.divIcon({
    className: 'map-label',
    html: '<span>District Name</span>'
  })
}).addTo(map);
```

**Pros:**
- Can toggle labels on/off
- Customizable styling
- No image processing needed

**Cons:**
- Need to manually define label positions
- Might clutter the map

### Option 2: Image Enhancement
Use image processing to add contrast/colors to Serebii map:
- Adjust saturation/brightness
- Add subtle color coding for districts
- Keep same file size and coordinates

**Pros:**
- Better visual appeal
- Keep existing integration

**Cons:**
- Requires image processing tools
- Subjective improvements

### Option 3: Higher Resolution Serebii Tiles
Check if Serebii has higher zoom levels:
- Download tiles at zoom level 2 or 3
- Stitch into larger image (2048×2048 or 4096×4096)
- Better zoom quality

**Pros:**
- Same coordinate system
- No baked-in overlays
- Better zoom experience

**Cons:**
- Larger file size
- Need to verify tiles exist

## Recommendation

**Keep Serebii map, add Option 1 (text overlays) later if needed.**

For now:
1. Serebii map works well
2. Fast load times
3. Clean integration
4. If labels are desired, add them as a separate toggleable layer

## Files Modified During Investigation

- `scripts/investigate-game8-map.js` - Browser console investigation script
- `scripts/README-game8-investigation.md` - Investigation guide
- `data/game8-map.jpg` - Downloaded sample (kept for reference)
