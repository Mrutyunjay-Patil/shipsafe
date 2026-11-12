# Test product photos

Synthetic photos for testing the listing vision model (Sell > photo > draft). In ShipSafe each
listing is one photo, and the colours the model finds become the Colour options a buyer picks
from, so each SKU here is a colourway.

Each product has one photo per colourway and one `all-colours` photo. Upload the `all-colours`
photo to check that the model returns every colour, not just the one in front.

The last word in each file name is the shooting style:

- `studio`: white paper sweep, even light, sharp, high JPEG quality.
- `phone`: handheld at home, 3:4 portrait, tilted, warm bulb light, the photographer's shadow,
  soft focus, noisy, low JPEG quality, sometimes cropped at the edge.
- `table`: flat lay on a wooden table in daylight.

## What a good draft looks like

| Folder | Product | SKUs (colours to expect) | Category |
|---|---|---|---|
| 01-blockprint-scarf | Block-printed cotton scarf with paisley (buta) motifs and fringe | indigo (cream print), cream with red print, mustard (brown print) | Scarves / accessories |
| 02-canvas-tote | Canvas tote bag with a sun screen print and "HAND PRINTED" | natural, black, olive | Bags |
| 03-ikat-cushion-cover | Ikat cushion cover with piped edge | cream with teal and orange, cream with rust and charcoal | Home decor / cushions |
| 04-table-runner | Block-printed table runner with tassels | cream with green, cream with pink, cream with charcoal | Home decor / table linen |
| 05-cotton-kurta | Long cotton kurta with buti embroidery and a button placket | white, sky blue, sage green | Clothing |

Things worth watching:

- Does the description stay within 140 characters and mention only what's visible?
- Does a `phone` photo get a worse draft than the `studio` photo of the same product?
- Does the white kurta on white paper still come out as "white" rather than "grey"?
- On the `all-colours` photos, are all 2 or 3 colours listed?
- Are the suggested USD prices sensible and consistent across colourways of the same product?

To regenerate, run `pip install pillow`, then `python test-products/gen_products.py test-products` from the project root.
