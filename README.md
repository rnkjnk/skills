# Static Resume Website

## Introduction

This project is a one-page resume website built with vanilla JavaScript and pure CSS. It loads content from JSON files, supports multiple visual themes, and does not depend on any third-party libraries or frameworks.

Check out the live demo here! https://rnkjnk.github.io/skills/

The main files are:

- `index.html` for the page structure
- `styles.css` for shared styling
- `themes/` for theme-specific styles
- `app.js` for rendering and interaction logic
- `data/data.json` for resume content
- `data/settings.json` for theme configuration

## How To Add Your Data

Edit `data/data.json`.

The main sections are:

- `profile`: name, headline, summary, and image settings
- `contact`: contact items such as location, email, phone, and links
- `experience`: work history entries
- `education`: education entries

Each experience item contains a `skills` array with full skill names, for example:

```json
{
	"title": "Senior Software Engineer",
	"company": "Example Co",
	"skills": ["JavaScript", "React", "CSS"]
}
```

The site builds the top skills section automatically from the skills listed inside your experience entries. Skill years are calculated from the duration of the positions where each skill appears.

## How To Add Your Picture(s)

Set your image paths inside `profile.photoByTheme` in `data/data.json`.

Example:

```json
"photoByTheme": {
	"light": "images/profile-light.jpg",
	"dark": "images/profile-dark.jpg",
	"retro": "images/profile-retro.jpg"
}
```

You can use:

- one different image per theme
- the same image path for all themes
- SVG, JPG, PNG, or other browser-supported image formats

Store the image files in `images/`, or update the paths if you prefer another folder.

## How To Set Default And Available Themes

Edit `data/settings.json`.

Available settings:

- `available-themes`: list of themes shown in the theme picker
- `default-theme`: the theme used on first load when no saved preference exists

Example:

```json
{
	"available-themes": ["light", "dark", "retro"],
	"default-theme": "light"
}
```

Notes:

- if only one theme is listed in `available-themes`, the theme picker is hidden
- the default theme must also appear in `available-themes`
- the supported theme names are `light`, `dark`, and `retro`

## The `start-server.cmd` Command

Run this from the project folder:

```bat
start-server.cmd
```

This starts the included local server so the site can load `data/data.json` and `data/settings.json` correctly in the browser.

By default, the site is served on:

```txt
http://localhost:8080/
```

You should use the local server instead of opening `index.html` directly with `file://`, because browsers may block JSON loading in that mode.