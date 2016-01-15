Tech = videojs.getTech('Tech')

class ChromecastTech extends Tech
  @isSupported = ->
    @player_.chromecastComponent.apiInitialized

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

    super  options

    @triggerReady()

  createEl: ->
    element = document.createElement "div"
    element.id = "#{@player_.id_}_chromecast_api"
    element.className = "videojs-tech videojs-tech-chromecast"
    element.innerHTML = """
      <div class="casting-image" style="background-image: url('#{@player_.options_.poster or @player_.poster_ }')"></div>
      <div class="casting-overlay">
        <div class="casting-information">
          <div class="casting-icon">&#58880</div>
          <div class="casting-description"><small>#{@localize "CASTING TO"}</small><br>#{@receiver}</div>
        </div>
      </div>
    """

    element.player = @player_

    element

  ###
  MEDIA PLAYER EVENTS
  ###

  play: ->
    # TODO play button isn't changing to a pause button ever?
    @player_.chromecastComponent.play()
    @trigger 'play'

  pause: ->
    @player_.chromecastComponent.pause()
    @trigger 'pause'

  paused: ->
    @player_.chromecastComponent.paused

  currentTime: ->
    @player_.chromecastComponent.currentMediaTime

  setCurrentTime: (seconds) ->
    @player_.chromecastComponent.seekMedia seconds

  currentSrc: (src) ->
    if typeof src != 'undefined'
      videojs.log "TODO Should change source to: #{src}"
    @player_.chromecastComponent.currentSrc_

  duration: ->
    # MAYBE TODO theoretically the player wants us to return a duration, but it doesn't seem to matter
    videojs.log "ChromecastTech got duration call??"

  ended: ->
    # this fires at strange times, but can just be ignored
    true

  conrols: ->
    false

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

videojs.registerTech "ChromecastTech", ChromecastTech
