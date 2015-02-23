class vjs.ChromecastComponent extends vjs.Button
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
    super player, settings

    @disable() unless player.controls()
    @hide()
    @initializeApi()

  initializeApi: ->
    # Check if the browser is Google Chrome
    return unless vjs.IS_CHROME

    # If the Cast APIs arent available yet, retry in 1000ms
    if not chrome.cast or not chrome.cast.isAvailable
      vjs.log "Cast APIs not available. Retrying..."
      setTimeout @initializeApi.bind(@), 1000
      return

    vjs.log "Cast APIs are available"

    appId = @settings.appId or chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID
    sessionRequest = new chrome.cast.SessionRequest(appId)

    apiConfig = new chrome.cast.ApiConfig(sessionRequest, @sessionJoinedListener, @receiverListener.bind(this))

    chrome.cast.initialize apiConfig, @onInitSuccess.bind(this), @castError

  sessionJoinedListener: (session) ->
    console.log "Session joined"

  receiverListener: (availability) ->
    @show() if availability is "available"

  onInitSuccess: ->
    @apiInitialized = true

  castError: (castError) ->
    vjs.log "Cast Error: #{JSON.stringify(castError)}"

  doLaunch: ->
    vjs.log "Cast video: #{@player_.currentSrc()}"
    if @apiInitialized
      chrome.cast.requestSession @onSessionSuccess.bind(this), @castError
    else
      vjs.log "Session not initialized"

  onSessionSuccess: (session) ->
    vjs.log "Session initialized: #{session.sessionId}"

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

    @player_.loadTech "ChromecastTech",
      receiver: @apiSession.receiver.friendlyName

    @casting = true
    @paused = @player_.paused()

    # Always show the controlbar
    @inactivityTimeout = @player_.options_.inactivityTimeout
    @player_.options_.inactivityTimeout = 0
    @player_.userActive true

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
      @apiMedia.play null, @mediaCommandSuccessCallback.bind(this, "Playing: " + @apiMedia.sessionId), @onError
      @paused = false

  pause: ->
    return unless @apiMedia

    unless @paused
      @apiMedia.pause null, @mediaCommandSuccessCallback.bind(this, "Paused: " + @apiMedia.sessionId), @onError
      @paused = true

  seekMedia: (position) ->
    request = new chrome.cast.media.SeekRequest()
    request.currentTime = position
    # Make sure playback resumes. videoWasPlaying does not survive minification.
    request.resumeState = chrome.cast.media.ResumeState.PLAYBACK_START if @player_.controlBar.progressControl.seekBar.videoWasPlaying

    @apiMedia.seek request, @onSeekSuccess.bind(this, position), @onError

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

    @apiMedia.setVolume request, @mediaCommandSuccessCallback.bind(this, "Volume changed"), @onError
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
    vjs.log information

  onError: ->
    vjs.log "error"

  # Stops the casting on the Chromecast
  stopCasting: ->
    @apiSession.stop @onStopAppSuccess.bind(this), @onError

  # Callback when the app has been successfully stopped
  onStopAppSuccess: ->
    clearInterval @timer
    @casting = false
    @removeClass "connected"

    @player_.src @player_.options_["sources"]

    # Resume playback if not paused when casting is stopped
    unless @paused
      @player_.one 'seeked', ->
        @player_.play()
    @player_.currentTime(@currentMediaTime)

    # Hide the default HTML5 player controls.
    @player_.tech.setControls(false)

    # Enable user activity timeout
    @player_.options_.inactivityTimeout = @inactivityTimeout

    @apiMedia = null
    @apiSession = null

  buildCSSClass: ->
    super + "vjs-chromecast-button"

  onClick: ->
    super
    if @casting then @stopCasting() else @doLaunch()
