# VideoJS Chromecast Plugin
Displays a Chromecast button in the control bar.

![video player](https://raw.githubusercontent.com/kim-company/videojs-chromecast/pg-update-readme/screenshots/chromecast-player.jpg)

## Getting started
**NOTE:** The Chromecast Plugin won't work if you open the index.html in the browser. It must run on a webserver.

1. Add `data-cast-api-enabled="true"` in your `<html>` Tag.
2. Include `videojs.chromecast.css` and `videojs.chromecast.js` on your Webpage.
3. Initialize the VideoJS Player with the Chromecast Plugin like the [configuration example](#configuration-example).
4. When a Chromecast is available in your network, you should see the cast button in the controlbar.

If you are not able to configure the player, check out the [demo directory](https://github.com/kim-company/videojs-chromecast/tree/master/demo).

### Configuration example
```javascript
videojs("my_player_id", {
  "plugins": {
    "chromecast": {
      appId: "AppID of your Chromecast App",
      metadata: {
        title: "Title",
        subtitle: "Subtitle"
      }
    }
  }
});
```


## Contributing
Ensure that you have installed [Node.js](http://www.nodejs.org) and [npm](http://www.npmjs.org/)

Test that Grunt's CLI is installed by running `grunt --version`. If the command isn't found, run `npm install -g grunt-cli`. For more information about installing Grunt, see the [getting started guide](http://gruntjs.com/getting-started).

1. Fork and clone the repository.
2. Run `npm install` to install the dependencies.
3. Run `grunt` to grunt this project.

#### You can test your changes with the included demo
1. Run `node demo-server.js` to start the server.
2. See `http://localhost:3000/demo/` in your browser.
