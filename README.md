# html-webpack-inline-assets-plugin
Based on html-webpack-plugin inline your resources

Improve the effect of [html-webpack-plugin](https://github.com/ampedandwired/html-webpack-plugin), the resources inline to html

## Installation
```bash
$ npm install --save-dev html-webpack-inline-assets-plugin
```

## Basic Usage
```
var HtmlWebpackInlineAssetsPlugin = require('html-webpack-inline-assets-plugin');
```
We need to pass the parameters `head` or `body` to tell us which resources are needed inline to html, the parameters you need to pass a **regular expression**
```
plugins: [
  new HtmlWebpackPlugin(),
  new HtmlWebpackInlineAssetsPlugin({
    head: '.(js|css)$',
    body: '.(js|css)$',
  })
]
```

## other
This plugin is modified from [html-webpack-inline-source-plugin](https://github.com/DustinJackson/html-webpack-inline-source-plugin)
