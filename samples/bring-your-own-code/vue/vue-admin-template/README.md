# Vue Admin Template

This is a sample admin template in Vue.js running on Power Pages.

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload
npm run dev

# build for production with minification
npm run build
```

The sample uses Vue 3 and Vite.

## Uploading to Power Pages

1. Open a terminal and cd into `vue-admin-template` folder.
1. Run `npm run build` to build the code.
1. Run `pac pages upload-code-site --rootPath .` to upload the site to Power Pages.

## Project Structure

```plaintext
vue-admin-template/
├── build/
│   └── legacy webpack configuration files
├── config/
│   └── legacy webpack configuration files
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
├── vite.config.js
```

### Reference

- [Vue.js](https://vuejs.org/)
- [Vite](https://vite.dev/)

## License

[MIT](https://github.com/fatihunlu/vue-admin-template/blob/master/LICENSE) license.
