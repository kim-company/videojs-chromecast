class vjs.ChromecastTech extends vjs.MediaTechController
  defaultMuted: false
  loop: false

  @isSupported = ->
    @player_.chromecastComponent.apiInitialized

  @canPlaySource = (source) ->
    source.type is "video/mp4"

  constructor: (player, options, ready) ->
    # Set the features that this Tech has
    @features["volumeControl"] = true
    @features["movingMediaElementInDOM"] = false
    @features["fullscreenResize"] = false
    @features["progressEvents"] = true
    @features["timeupdateEvents"] = true

    vjs.MediaTechController.call this, player, options, ready

    @el_ = videojs.Component::createEl("div",
      id: "#{@player_.id_}_chromecast_api"
      className: "vjs-tech"
      innerHTML: "<img src=\"#{@player_.options_.poster}\" class=\"backgroundImage\" /><div class=\"currentlyCasting\"><h2 class=\"castingLabel\">Casting to device</h2></div>"
    )

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

  duration: ->
    0

  buffered: ->
    length: 0

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

  enterFullScreen: ->
    vjs.log "enterFullScreen"

  exitFullScreen: ->
    vjs.log "exitFullScreen"

  src: (src) ->
    vjs.log "ChromecastTech::src -> #{src}"

  load: ->
    vjs.log "ChromecastTech::load"

  currentSrc: ->
    vjs.log "currentSrc"

  poster: ->
    vjs.log "poster?"

  setPoster: (val) ->
    vjs.log "setPoster: #{val}"

  preload: ->
    true

  setPreload: (val) ->
    vjs.log "setPreload: #{val}"

  autoplay: ->
    true

  setAutoplay: (val) ->
    vjs.log "setAutoplay: #{val}"

  controls: ->
    true

  setControls: (val) ->
    vjs.log "setControls: #{val}"

  setLoop: (val) ->
    vjs.log "setLoop: #{val}"

  error: ->
    false

  seeking: ->
    false

  ended: ->
    false
