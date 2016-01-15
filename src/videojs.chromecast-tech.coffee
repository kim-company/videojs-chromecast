Tech = videojs.getTech('Tech')

class ChromecastTech extends Tech
  @isSupported = ->
    @chromecastComponent_.apiInitialized

  @canPlaySource = (source) ->
    source.type is "video/mp4" or
    source.type is "video/webm" or
    source.type is "application/x-mpegURL" or
    source.type is "application/vnd.apple.mpegURL"

  constructor: (options) ->
    @featuresVolumeControl = true
    @movingMediaElementInDOM = false
    @featuresFullscreenResize = false
    @featuresProgressEvents = true

    @receiver = options.source.receiver

    @player_id_ = options.playerId
    @chromecastComponent_ = options.source.chromecastComponent
    @poster_ = options.poster
    @currentSrc_ = options.source.currentSrc

    super options

    @triggerReady()

  createEl: ->
    element = document.createElement "div"
    element.id = "#{@player_id_}_chromecast_api"
    element.className = "vjs-tech vjs-tech-chromecast"
    element.innerHTML = """
      <div class="casting-image" style="background-image: url('#{@poster_}')"></div>
      <div class="casting-overlay">
        <div class="casting-information">
          <div class="casting-icon"></div>
          <div class="casting-description"><small>#{@localize "CASTING TO"}</small><br>#{@receiver}</div>
        </div>
      </div>
    """

    element

  ###
  MEDIA PLAYER EVENTS
  ###

  play: ->
    # TODO play button isn't changing to a pause button ever?
    @chromecastComponent_.play()
    @trigger 'play'

  pause: ->
    @chromecastComponent_.pause()
    @trigger 'pause'

  paused: ->
    @chromecastComponent_.paused

  currentTime: ->
    @chromecastComponent_.currentMediaTime

  setCurrentTime: (seconds) ->
    @chromecastComponent_.seekMedia seconds

  currentSrc: (src) ->
    if typeof src != 'undefined'
      videojs.log "TODO Should change source to: #{src}"
    @currentSrc_

  src: (src) ->
    @currentSrc src

  duration: ->
    # MAYBE TODO theoretically the player wants us to return a duration, but it doesn't seem to matter
    videojs.log "ChromecastTech got duration call??"

  ended: ->
    # this fires at strange times, but can just be ignored
    true

  controls: ->
    false

  volume: ->
    @chromecastComponent_.currentVolume

  setVolume: (volume) ->
    @chromecastComponent_.setMediaVolume volume, false

  muted: ->
    @chromecastComponent_.muted

  setMuted: (muted) ->
    @chromecastComponent_.setMediaVolume @chromecastComponent_.currentVolume, muted

  supportsFullScreen: ->
    false

videojs.registerTech "ChromecastTech", ChromecastTech
