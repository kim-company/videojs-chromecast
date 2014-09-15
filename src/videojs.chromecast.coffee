vjs.plugin "chromecast", (options) ->
  @player = @

  # Add chromecast component to the controlbar
  @chromeCastComponent = new vjs.ChromeCastComponent(@, options)
  @player.controlBar.addChild @chromeCastComponent
