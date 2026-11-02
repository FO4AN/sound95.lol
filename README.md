# sound95.lol

The website for [Sound95](https://github.com/FO4AN/sound95), a Windows 95 style desktop
client for SoundCloud. Made by FO4AN.

It's plain HTML, CSS and JavaScript with no build step and no dependencies. `docs/` is
the site, and GitHub Pages serves it from the `main` branch. The widget styles, pixel
icons and Visualizer come from the app, so the site looks like it.

## Run it locally

```bash
python3 -m http.server 8095 --directory docs
```

Then open http://localhost:8095.

## Security

- Nothing is loaded from other sites. The one outside request is the Download page
  asking GitHub for the latest release, and the page keeps only links that point at
  this project's own release files.
- Every page sets a strict Content Security Policy, so inline scripts and outside
  scripts don't run.
- There are no cookies, no analytics and no forms.

See [SECURITY.md](SECURITY.md) to report a problem.

The font comes from [98.css](https://github.com/jdan/98.css) and is MIT licensed; see
`docs/fonts/LICENSE.txt`.
