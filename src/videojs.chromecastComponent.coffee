class vjs.ChromecastComponent extends vjs.Button
  kind_: "chromecast"
  buttonText: "Chromecast"
  className: "vjs-chromecast-button "

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
    vjs.Button.call this, player, settings

    # Disable the plugin if the player has no controls
    @disable() unless player.controls()

    @hide()
    @el_.setAttribute "role", "button"

    @initializeApi()
    return

  initializeApi: ->
    # Check if the browser is Google Chrome
    return unless vjs.IS_CHROME

    # If the Cast APIs arent available yet, retry in 1000ms
    if not chrome.cast or not chrome.cast.isAvailable
      vjs.log "Cast APIs not available. Retrying..."
      setTimeout @initializeApi.bind(@), 1000
      return

    vjs.log "Cast APIs are available"

    # Initialize the SessionRequest with the given App ID and the apiConfig.
    sessionRequest = if @settings.appId
      new chrome.cast.SessionRequest(@settings.appId)
    else
      new chrome.cast.SessionRequest(chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID)
    apiConfig = new chrome.cast.ApiConfig(sessionRequest, @sessionJoinedListener, @receiverListener.bind(this))

    # Initialize Chromecast
    chrome.cast.initialize(apiConfig, @onInitSuccess.bind(this), @castError)

  sessionJoinedListener: (session) ->
    vjs.log "Joined #{session.sessionId}"

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

    mediaInfo = new chrome.cast.media.MediaInfo(@player_.currentSrc(), "video/mp4")

    loadRequest = new chrome.cast.media.LoadRequest(mediaInfo)
    loadRequest.autoplay = true
    loadRequest.currentTime = @player_.currentTime()

    @apiSession.loadMedia loadRequest, @onMediaDiscovered.bind(this), @castError

  onMediaDiscovered: (media) ->
    @apiMedia = media
    @apiMedia.addUpdateListener @onMediaStatusUpdate.bind(this)

    @startProgressTimer @incrementMediaTime.bind(this)

    @paused = false
    @player_.loadTech "ChromecastTech", {}
    @player_.userActive true
    @casting = true

  onMediaStatusUpdate: (event) ->
    return unless @apiMedia

    console.log @apiMedia

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

  ###
  MEDIA PLAYER EVENTS
  ###

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

    vjs.insertFirst @player_.tech.el_, @player_.el()

    if @apiMedia.playerState is chrome.cast.media.PlayerState.IDLE
      @player_.currentTime 0
      @player_.onPause()
    else
      @player_.currentTime @currentMediaTime
      @player_.play() unless @paused

    @apiMedia = null

  buildCSSClass: ->
    @className + vjs.Button::buildCSSClass.call(this)

  createEl: (type, props) ->
    vjs.Button::createEl.call(this, "div")

  onClick: ->
    vjs.Button::onClick.call this
    if @casting then @stopCasting() else @doLaunch()
