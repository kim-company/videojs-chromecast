videojs.plugin "chromecast", (options) ->
  @ready ->
    @chromecastComponent = @controlBar.addChild 'ChromecastComponent', options
