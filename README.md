# anatomy-tryouts

Interactive isometric figures: small physical machines that explain an idea. Built with the anatomy skill's kit (`kit/`).

| Figure | Idea |
|---|---|
| [accretion](accretion/) | Planetary accretion: a body sweeping up dust, with gravitational focusing |

More are planned: see [IDEAS.md](IDEAS.md).

## Run one
```bash
cd accretion
node build.mjs          # dark  -> accretion.html
node build.mjs --light  # light -> accretion-light.html
```
Open the HTML file in a browser. Move the pointer across the figure to change the time-lapse; R restarts.

![accretion](accretion/preview.png)
