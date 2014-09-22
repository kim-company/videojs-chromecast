class vjs.ChromecastTech extends vjs.MediaTechController
  @isSupported = ->
    @player_.chromecastComponent.apiInitialized

  @canPlaySource = (source) ->
    source.type is "video/mp4"

  constructor: (player, options, ready) ->
    @["featuresVolumeControl"] = true
    @["movingMediaElementInDOM"] = false
    @["featuresFullscreenResize"] = false
    @["featuresProgressEvents"] = true

    vjs.MediaTechController.call this, player, options, ready

    @el_ = videojs.Component::createEl "div",
      id: "#{@player_.id_}_chromecast_api"
      className: "vjs-tech vjs-tech-chromecast"
      innerHTML: "<div class=\"casting-image\" style=\"background-image: url('#{@player_.options_.poster}')\"></div><div class=\"casting-overlay\"><div class=\"casting-information\"><div class=\"casting-icon\">&#58880</div><div class=\"casting-description\"><small>CASTING TO</small><br>Chromecast</div></div>"

    vjs.insertFirst @el_, @player_.el()
    @triggerReady()

  dispose: ->
    vjs.MediaTechController::dispose.call this

  ###
  MEDIA PLAYER EVENTS
  ###

  play: ->
    @player_.chromecastComponent.play()
    @player_.onPlay()

  pause: ->
    @player_.chromecastComponent.pause()
    @player_.onPause()

  paused: ->
    @player_.chromecastComponent.paused

  currentTime: ->
    @player_.chromecastComponent.currentMediaTime

  setCurrentTime: (seconds) ->
    @player_.chromecastComponent.seekMedia seconds

  volume: ->
    @player_.chromecastComponent.currentVolume

  setVolume: (volume) ->
    @player_.chromecastComponent.setMediaVolume volume, false

  muted: ->
    @player_.chromecastComponent.muted

  setMuted: (muted) ->
    @player_.chromecastComponent.setMediaVolume @player_.chromecastComponent.currentVolume, muted

  supportsFullScreen: ->
    false
