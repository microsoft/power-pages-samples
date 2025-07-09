# Vue Admin Template

This is a sample admin template in Vuejs. This is a copy of [Vue Admin Template](https://github.com/fatihunlu/vue-admin-template?) running on Power Pages. If you like this template please consider starring the original repo.

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).

## Uploading to Power Pages

1. Open a terminal and cd into `vue-admin-template` folder.
1. Run `npm run build` to build the code.
1. Run `pac pages upload-code-site --rootPath .` to upload the site to Power Pages.

## Project Structure

```plaintext
vue-admin-template/
├── build/
│   ├── build.js
│   ├── check-versions.js
│   ├── logo.png
│   ├── utils.js
│   ├── vue-loader.conf.js
│   ├── webpack.base.conf.js
│   ├── webpack.dev.conf.js
│   └── webpack.prod.conf.js
├── config/
│   ├── dev.env.js
│   ├── index.js
│   └── prod.env.js
├── src/
│   ├── assets/
│   ├── components/
│   ├── config/
│   ├── i18n/
│   ├── pages/
│   ├── router/
│   ├── styles/
│   ├── App.vue
│   └── main.js
├── static/
│   ├── logo.png
│   ├── preview.JPG
│   └── template.gif
├── index.html
├── package.json
├── powerpages.config.json
```

### Reference

- [Vue.js](https://vuejs.org/)
- [Vuetifyjs](https://vuetifyjs.com/)
- [VueChartKick](https://github.com/ankane/vue-chartkick)
- [vue-fullcalendar](https://github.com/Wanderxx/vue-fullcalendar)
- [vue-swatches](https://saintplay.github.io/vue-swatches/#sub-using-a-preset)

## License

[MIT](https://github.com/fatihunlu/vue-admin-template/blob/master/LICENSE) license.
