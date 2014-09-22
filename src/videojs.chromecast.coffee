vjs.plugin "chromecast", (options) ->
  @chromecastComponent = new vjs.ChromecastComponent(@, options)
  @controlBar.addChild @chromecastComponent
