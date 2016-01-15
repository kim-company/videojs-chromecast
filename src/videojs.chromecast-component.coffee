vjsButton = videojs.getComponent "Button"

class ChromecastComponent extends vjsButton
  buttonText: "Chromecast"
  inactivityTimeout: 2000

  apiInitialized: false
  apiSession: null
  apiMedia: null

  casting: false
  paused: true
  muted: false
  currentVolume: 1
  currentMediaTime: 0

  timer: null
  timerStep: 1000

  constructor: (player, @settings) ->
    super player, @settings

    @disable() unless player.controls()
    @hide()
    @initializeApi()

  initializeApi: ->
    # Check if the browser is Google Chrome
    return unless videojs.browser.IS_CHROME

    # If the Cast APIs arent available yet, retry in 1000ms
    if not chrome.cast or not chrome.cast.isAvailable
      videojs.log "Cast APIs not available. Waiting..."
      window['__onGCastApiAvailable'] = @deferedInitialize.bind(@)
      return

    videojs.log "Cast APIs are available"

    appId = @settings.hasOwnProperty('appId') and @settings.appId or chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
    sessionRequest = new chrome.cast.SessionRequest(appId)

    apiConfig = new chrome.cast.ApiConfig(sessionRequest, @sessionJoinedListener, @receiverListener.bind(this))

    chrome.cast.initialize apiConfig, @onInitSuccess.bind(this), @castError

  deferedInitialize: (loaded, errorInfo) ->
    if loaded
      @initializeApi
    else
      videojs.log "Error initialising API"
      videojs.log errorInfo

  sessionJoinedListener: (session) ->
    # TODO/TK actually do something about the session we joined (load the tech maybe?)
    console.log "Session joined"

  receiverListener: (availability) ->
    @show() if availability is chrome.cast.ReceiverAvailability.AVAILABLE

  onInitSuccess: ->
    @apiInitialized = true

  castError: (castError) ->
    videojs.log "Cast Error: #{JSON.stringify(castError)}"

  doLaunch: ->
    videojs.log "Cast video: #{@player_.currentSrc()}"
    if @apiInitialized
      chrome.cast.requestSession @onSessionSuccess.bind(this), @castError
    else
      videojs.log "Session not initialized"

  onSessionSuccess: (session) ->
    # TODO stop the control-bar disappearing in 'not-hover'
    videojs.log "Session initialized: #{session.sessionId}"

    @apiSession = session
    @addClass "connected"

    mediaInfo = new chrome.cast.media.MediaInfo @player_.currentSrc(), @player_.currentType()

    if @settings.metadata
      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata()

      for key, value of @settings.metadata
        mediaInfo.metadata[key] = value

      if @player_.options_.poster
        image = new chrome.cast.Image(@player_.options_.poster)
        mediaInfo.metadata.images = [image]

    loadRequest = new chrome.cast.media.LoadRequest(mediaInfo)
    loadRequest.autoplay = true
    loadRequest.currentTime = @player_.currentTime()

    @apiSession.loadMedia loadRequest, @onMediaDiscovered.bind(this), @castError
    @apiSession.addUpdateListener @onSessionUpdate.bind(this)

  onMediaDiscovered: (media) ->
    @apiMedia = media
    @apiMedia.addUpdateListener @onMediaStatusUpdate.bind(this)

    @startProgressTimer @incrementMediaTime.bind(this)

    @player_.loadTech_ "ChromecastTech", {
      currentSrc: @player_.currentSrc(),
      receiver: @apiSession.receiver.friendlyName,
      chromecastComponent: @
    }

    @casting = true
    @paused = @player_.paused()

    # Always show the controlbar
    @inactivityTimeout = @player_.options_.inactivityTimeout
    @player_.options_.inactivityTimeout = 0
    @player_.removeClass 'not-hover'
    @player_.on 'mouseout', @doNotHover.bind(@)
    @player_.userActive true

  doNotHover: ->
    @player_.removeClass 'not-hover'

  onSessionUpdate: (isAlive) ->
    return unless @apiMedia

    @onStopAppSuccess() if not isAlive

  onMediaStatusUpdate: (isAlive) ->
    return unless @apiMedia

    @currentMediaTime = @apiMedia.currentTime

    switch @apiMedia.playerState
      when chrome.cast.media.PlayerState.IDLE
        @currentMediaTime = 0
        @trigger "timeupdate"
        @onStopAppSuccess()
      when chrome.cast.media.PlayerState.PAUSED
        return if @paused
        @player_.pause()
        @paused = true
      when chrome.cast.media.PlayerState.PLAYING
        return unless @paused
        @player_.play()
        @paused = false

  startProgressTimer: (callback) ->
    if @timer
      clearInterval @timer
      @timer = null

    @timer = setInterval(callback.bind(this), @timerStep)

  play: ->
    return unless @apiMedia
    if @paused
      @apiMedia.play null, @mediaCommandSuccessCallback.bind(this, "Playing: " + @apiMedia.sessionId), @handleTechError
      @paused = false

  pause: ->
    return unless @apiMedia

    unless @paused
      @apiMedia.pause null, @mediaCommandSuccessCallback.bind(this, "Paused: " + @apiMedia.sessionId), @handleTechError
      @paused = true

  seekMedia: (position) ->
    request = new chrome.cast.media.SeekRequest()
    request.currentTime = position
    # Make sure playback resumes. videoWasPlaying does not survive minification.
    request.resumeState = chrome.cast.media.ResumeState.PLAYBACK_START if @player_.controlBar.progressControl.seekBar.videoWasPlaying

    @apiMedia.seek request, @onSeekSuccess.bind(this, position), @handleTechError

  onSeekSuccess: (position) ->
    @currentMediaTime = position

  setMediaVolume: (level, mute) ->
    return unless @apiMedia

    volume = new chrome.cast.Volume()
    volume.level = level
    volume.muted = mute

    @currentVolume = volume.level
    @muted = mute

    request = new chrome.cast.media.VolumeRequest()
    request.volume = volume

    @apiMedia.setVolume request, @mediaCommandSuccessCallback.bind(this, "Volume changed"), @handleTechError
    @player_.trigger "volumechange"

  incrementMediaTime: ->
    return unless @apiMedia.playerState is chrome.cast.media.PlayerState.PLAYING

    if @currentMediaTime < @apiMedia.media.duration
      @currentMediaTime += 1
      @trigger "timeupdate"
    else
      @currentMediaTime = 0
      clearInterval @timer

  mediaCommandSuccessCallback: (information, event) ->
    videojs.log information

  handleTechError: ->
    videojs.log "error"

  # Stops the casting on the Chromecast
  stopCasting: ->
    @apiSession.stop @onStopAppSuccess.bind(this), @handleTechError

  # Callback when the app has been successfully stopped
  onStopAppSuccess: ->
    clearInterval @timer
    @casting = false
    @removeClass "connected"

    if @player_.catalog and @player_.catalog.load and @player_.mediainfo and @player_.mediainfo.id
      @player_.catalog.load @player_.mediainfo
    else
      @player_.src @player_.options_["sources"]

    # Resume playback if not paused when casting is stopped
    unless @paused
      @player_.one 'seeked', ->
        @player_.play()
    @player_.currentTime(@currentMediaTime)

    # Enable user activity timeout
    @player_.options_.inactivityTimeout = @inactivityTimeout

    @apiMedia = null
    @apiSession = null

  buildCSSClass: ->
    super + "vjs-chromecast-button"

  handleClick: ->
    super
    if @casting then @stopCasting() else @doLaunch()

videojs.registerComponent "ChromecastComponent", ChromecastComponent
