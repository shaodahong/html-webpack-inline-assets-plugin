'use strict';
var escapeRegex = require('escape-string-regexp');
var path = require('path');
var slash = require('slash');
var sourceMapUrl = require('source-map-url');

function HtmlWebpackInlineAssetsPlugin(options) {
    this.options = options;
}

HtmlWebpackInlineAssetsPlugin.prototype.apply = function (compiler) {
    var self = this;
    var options = this.options;

    // Hook into the html-webpack-plugin processing
    compiler.plugin('compilation', function (compilation) {
        compilation.plugin('html-webpack-plugin-alter-asset-tags', function (htmlPluginData, callback) {
            // if no options
            if (!options || JSON.stringify(options) === '{}') {
                return callback(null, htmlPluginData);
            }

            var result = self.processTags(compilation, options, htmlPluginData);

            callback(null, result);
        });
    });
};

HtmlWebpackInlineAssetsPlugin.prototype.processTags = function (compilation, options, pluginData) {
    var self = this;

    var body = [];
    var head = [];

    var bodyRegex = (options.body && new RegExp(options.body)) || '';
    var headRegex = (options.head && new RegExp(options.head)) || '';

    pluginData.head.forEach(function (tag) {
        if (bodyRegex && (bodyRegex.test(tag.attributes.src) || bodyRegex.test(tag.attributes.href))) {
            body.push(self.processTag(compilation, options, tag));
        }else {
            head.push(self.processTag(compilation, options, tag));
        }
    });


    pluginData.body.forEach(function (tag) {
        if (headRegex && (headRegex.test(tag.attributes.src) || headRegex.test(tag.attributes.href))) {
            head.push(self.processTag(compilation, options, tag));
        }else {
            body.push(self.processTag(compilation, options, tag));
        }
    });

    return {
        head: head,
        body: body,
        plugin: pluginData.plugin,
        chunks: pluginData.chunks,
        outputName: pluginData.outputName
    };
};

HtmlWebpackInlineAssetsPlugin.prototype.resolveSourceMaps = function (compilation, assetName, asset) {
    var source = asset.source();
    var out = compilation.outputOptions;
    // Get asset file absolute path
    var assetPath = path.join(out.path, assetName);
    // Extract original sourcemap URL from source string
    if (typeof source !== 'string') {
        source = source.toString();
    }
    var mapUrlOriginal = sourceMapUrl.getFrom(source);
    // Return unmodified source if map is unspecified, URL-encoded, or already relative to site root
    if (!mapUrlOriginal || mapUrlOriginal.indexOf('data:') === 0 || mapUrlOriginal.indexOf('/') === 0) {
        return source;
    }
    // Figure out sourcemap file path *relative to the asset file path*
    var assetDir = path.dirname(assetPath);
    var mapPath = path.join(assetDir, mapUrlOriginal);
    var mapPathRelative = path.relative(out.path, mapPath);
    // Starting with Node 6, `path` module throws on `undefined`
    var publicPath = out.publicPath || '';
    // Prepend Webpack public URL path to source map relative path
    // Calling `slash` converts Windows backslashes to forward slashes
    var mapUrlCorrected = slash(path.join(publicPath, mapPathRelative));
    // Regex: exact original sourcemap URL, possibly '*/' (for CSS), then EOF, ignoring whitespace
    var regex = new RegExp(escapeRegex(mapUrlOriginal) + '(\\s*(?:\\*/)?\\s*$)');
    // Replace sourcemap URL and (if necessary) preserve closing '*/' and whitespace
    return source.replace(regex, function (match, group) {
        return mapUrlCorrected + group;
    });
};

HtmlWebpackInlineAssetsPlugin.prototype.processTag = function (compilation, options, tag) {
    var assetUrl;

    var bodyRegex = (options.body && new RegExp(options.body)) || '';
    var headRegex = (options.head && new RegExp(options.head)) || '';

    // inline js
    if (tag.tagName === 'script' && ((bodyRegex && bodyRegex.test(tag.attributes.src)) || headRegex && headRegex.test(tag.attributes.src)) ) {
        assetUrl = tag.attributes.src;
        tag = {
            tagName: 'script',
            closeTag: true,
            attributes: {
                type: 'text/javascript'
            }
        };

        // inline css
    } else if (tag.tagName === 'link' && ((bodyRegex && bodyRegex.test(tag.attributes.href)) || headRegex && headRegex.test(tag.attributes.href))) {
        assetUrl = tag.attributes.href;
        tag = {
            tagName: 'style',
            closeTag: true,
            attributes: {
                type: 'text/css'
            }
        };
    }

    if (assetUrl) {
        // Strip public URL prefix from asset URL to get Webpack asset name
        var publicUrlPrefix = compilation.outputOptions.publicPath || '';
        var assetName = path.posix.relative(publicUrlPrefix, assetUrl);
        var asset = compilation.assets[assetName];
        var updatedSource = this.resolveSourceMaps(compilation, assetName, asset);
        tag.innerHTML = (tag.tagName === 'script') ? updatedSource.replace(/(<)(\/script>)/g, '\\x3C$2') : updatedSource;
    }

    return tag;
};

module.exports = HtmlWebpackInlineAssetsPlugin;