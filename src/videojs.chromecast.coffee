videojs.plugin "chromecast", (options) ->
  @chromecastComponent = new videojs.ChromecastComponent(@, options)
  @controlBar.addChild @chromecastComponent
