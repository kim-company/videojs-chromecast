vjs.plugin "chromecast", (options) ->
  @player = @

  # Add chromecast component to the controlbar
  @chromecastComponent = new vjs.ChromecastComponent(@, options)
  @player.controlBar.addChild @chromecastComponent
