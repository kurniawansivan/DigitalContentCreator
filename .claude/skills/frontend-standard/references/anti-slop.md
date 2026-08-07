# Banned Visual Patterns

These are the defaults that make an interface read as machine-generated. They are not
forbidden because they are ugly in isolation - they are forbidden because they are the
lowest-effort choice, they appear together, and they signal that nobody made a decision.

## Banned, with the replacement

| Banned | Why | Instead |
| --- | --- | --- |
| Purple-to-blue (or teal-to-purple) gradient hero | The single most recognisable generated-site marker | One solid brand color, or a photograph, or a typographic hero with real contrast |
| Three feature cards in a row, each with a generic outline icon, a two-word title, and one filler sentence | Says nothing; identical across ten thousand sites | Show the product. A screenshot, a real number, a specific claim. If there are five features, do not force three |
| Glassmorphism with no depth behind it | Blur over a flat background is noise | Use a solid surface token and a real elevation shadow |
| Every secondary text set to a mid grey | Flattens hierarchy into one mush | Two text tones at most: `--color-text` and `--color-text-muted`, chosen deliberately |
| Emoji as bullets, section markers, or button icons | Reads as filler | The product icon set, or no icon |
| Invented testimonials, logos, statistics, or names | Fabricated social proof | Real content, or a clearly labelled placeholder |
| "Lorem ipsum" or "Your amazing product here" left in | Unfinished | Real copy, or realistic sample content |
| A pill-shaped badge above every heading ("✨ New") | Decoration pretending to be information | Nothing, unless the badge carries real state |
| Centered everything, full width, three sections of equal weight | No hierarchy, nothing to look at | One clear focal point per screen; vary section rhythm and density |
| A dark hero followed by a light body followed by a dark footer | Contrast without purpose | Choose a surface strategy and hold it |
| Animated gradient blobs or floating shapes in the background | Movement with no meaning | Static composition. Motion only on interaction |
| Six font weights and three families | No typographic system | One or two families, three weights |
| `box-shadow: 0 10px 30px rgba(0,0,0,0.3)` on everything | Uniform heavy shadow flattens depth | Layered low-opacity shadows from the elevation tokens, used sparingly |
| Border radius that varies per component by accident | Incoherent | Radius tokens only |
| An "AI-powered" badge, sparkle icons, or robot mascot with no function | Decoration | Describe what it actually does |

## What good looks like instead

**Hierarchy over decoration.** Each screen has one primary action. Size, weight, color, and
position all point at it. If everything is emphasized, nothing is.

**Real content shapes the layout.** Design with the longest realistic name, the empty list,
the 200-row table, the failed payment. Layouts built around ideal content break on day one.

**Restraint in color.** One accent used for interactive and primary elements only. Neutrals
carry the rest. Semantic colors (danger, success, warning) mean exactly that and are never
used decoratively.

**Deliberate density.** Related things are close, unrelated things are far. Spacing comes
from the scale, and the jumps between groups are visible.

**Alignment.** Everything sits on a shared grid. Optical alignment beats mathematical
alignment when they disagree.

**Motion with a job.** A thing that moves is telling you where it came from or that
something changed. Nothing loops. Nothing moves on load for effect.

**Craft in the small states.** Empty states say what to do next, not "No data". Errors say
what happened and how to fix it. Loading matches the shape of the content that will arrive.
Success is confirmed. These four states are where an interface stops feeling generated.

## Before you call a screen finished

- [ ] Could this screen belong to any product? If yes, it is not done
- [ ] Is there exactly one obvious primary action?
- [ ] Does it hold up with real, long, and empty content?
- [ ] Is every gradient, shadow, blur, and animation there for a reason you can state?
- [ ] Have you removed everything that is decoration only?
