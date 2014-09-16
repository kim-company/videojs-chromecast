class vjs.ChromeCastComponent extends vjs.Button
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
      vjs.log "Cast APIs not Available. Retrying..."
      setTimeout @initializeApi.bind(@), 1000
      return

    # Initialize the SessionRequest with the given App ID and the apiConfig.
    sessionRequest = if @settings.appId
      new chrome.cast.SessionRequest(@settings.appId)
    else
      new chrome.cast.SessionRequest(chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID)
    apiConfig = new chrome.cast.ApiConfig(sessionRequest, @sessionJoinedListener, @receiverListener.bind(this))

    # Initialize Chromecast
    chrome.cast.initialize(apiConfig, @onInitSuccess.bind(this), @onInitError)

  sessionJoinedListener: (session) ->
    vjs.log "Joined #{session.sessionId}"

  receiverListener: (availability) ->
    @show() if availability is "available"

  onInitSuccess: ->
    @apiInitialized = true

  onInitError: (castError) ->
    vjs.log "Initialize Error: #{JSON.stringify(castError)}"

vjs.ChromeCastComponent::kind_ = "chromecast"
vjs.ChromeCastComponent::buttonText = "Chromecast"
vjs.ChromeCastComponent::className = "vjs-chromecast-button "
vjs.ChromeCastComponent::chromeCastBanner = {}
vjs.ChromeCastComponent::apiMedia = null
vjs.ChromeCastComponent::apiSession = null
vjs.ChromeCastComponent::apiInitialized = false
vjs.ChromeCastComponent::casting = false
vjs.ChromeCastComponent::progressFlag = 1
vjs.ChromeCastComponent::timer = null
vjs.ChromeCastComponent::timerStep = 1000
vjs.ChromeCastComponent::currentMediaTime = 0
vjs.ChromeCastComponent::paused = true
vjs.ChromeCastComponent::seeking = false
vjs.ChromeCastComponent::currentVolume = 1
vjs.ChromeCastComponent::muted = false
#vjs.ChromeCastComponent.boundEvents = {}

vjs.ChromeCastComponent::doLaunch = ->
  vjs.log "Cast video : " + @player_.currentSrc()
  if @apiInitialized

    # Success

    # Error
    chrome.cast.requestSession @onSessionSuccess.bind(this), (castError) ->
      vjs.log "session_established ERROR: " + JSON.stringify(castError)
      return

  else
    vjs.log "session_established NOT INITIALIZED"
  return

vjs.ChromeCastComponent::onSessionSuccess = (session) ->
  @apiSession = session
  vjs.log "session_established YES - " + session.sessionId
  @addClass "connected"

  #this.player_.pause();
  #    this.player_.chromeCastComponent.disableNativeControls();
  mediaInfo = new chrome.cast.media.MediaInfo(@player_.currentSrc(), "video/mp4")

  #vjs.log("## MediaInfo('" + url + "', '" + mime + "')");
  loadRequest = new chrome.cast.media.LoadRequest(mediaInfo)
  loadRequest.autoplay = true
  vjs.log "Sending Load Request: "
  vjs.log loadRequest
  loadRequest.currentTime = @player_.currentTime()
  @apiSession.loadMedia loadRequest, @onMediaDiscovered.bind(this), @onMediaError.bind(this)
  return

vjs.ChromeCastComponent::onMediaDiscovered = (media) ->

  # chrome.cast.media.Media object
  @apiMedia = media
  @apiMedia.addUpdateListener @onMediaStatusUpdate.bind(this)
  vjs.log "Got media object"
  @startProgressTimer @incrementMediaTime.bind(this)
  vjs.log "play!!!!"
  @paused = false
  @player_.loadTech "ChromecastTech", {}
  @player_.userActive true
  @casting = true
  return

vjs.ChromeCastComponent::onMediaError = (castError) ->
  vjs.log "Media Error: " + JSON.stringify(castError)
  return

vjs.ChromeCastComponent::onMediaStatusUpdate = (e) ->
  return  unless @apiMedia

  #vjs.log(parseInt(100 * this.apiMedia.currentTime / this.apiMedia.media.duration) + "%");
  vjs.log @apiMedia.currentTime + "/" + @apiMedia.media.duration  if @progressFlag
  vjs.ChromeCastComponent::currentMediaTime = @apiMedia.currentTime
  vjs.log @apiMedia.playerState
  if @apiMedia.playerState is "IDLE"
    @currentMediaTime = 0
    @trigger "timeupdate"
    @onStopAppSuccess()
  return

vjs.ChromeCastComponent::startProgressTimer = (callback) ->
  if @timer
    clearInterval @timer
    @timer = null
  vjs.log "starting timer..."

  # start progress timer
  @timer = setInterval(callback.bind(this), @timerStep)
  return

vjs.ChromeCastComponent::duration = ->
  return 0  unless @apiMedia
  @apiMedia.media.duration


###*
play media
###
vjs.ChromeCastComponent::play = ->
  return  unless @apiMedia
  if @paused
    @apiMedia.play null, @mediaCommandSuccessCallback.bind(this, "playing started for " + @apiMedia.sessionId), @onError.bind(this)
    @apiMedia.addUpdateListener @onMediaStatusUpdate.bind(this)

    #this.player_.controlBar.playToggle.onPlay();
    #this.player_.onPlay();
    @paused = false
  return

vjs.ChromeCastComponent::pause = ->
  return  unless @apiMedia
  unless @paused
    @apiMedia.pause null, @mediaCommandSuccessCallback.bind(this, "paused " + @apiMedia.sessionId), @onError.bind(this)

    #this.player_.controlBar.playToggle.onPause();
    #        this.player_.onPause();
    @paused = true
  return


###*
seek media position
@param {Number} pos A number to indicate percent
###
vjs.ChromeCastComponent::seekMedia = (pos) ->

  #console.log('Seeking ' + currentMediaSession.sessionId + ':' +
  #        currentMediaSession.mediaSessionId + ' to ' + pos + "%");

  #progressFlag = 0;
  request = new chrome.cast.media.SeekRequest()
  request.currentTime = pos
  @apiMedia.seek request, @onSeekSuccess.bind(this, pos), @onError
  return

vjs.ChromeCastComponent::onSeekSuccess = (pos) ->
  @currentMediaTime = pos
  return


#appendMessage(info);
#setTimeout(function() {
#        progressFlag = 1
#    }, 1500);
vjs.ChromeCastComponent::setMediaVolume = (level, mute) ->
  return  unless @apiMedia
  volume = new chrome.cast.Volume()
  volume.level = level
  @currentVolume = volume.level
  volume.muted = mute
  @muted = mute
  request = new chrome.cast.media.VolumeRequest()
  request.volume = volume
  @apiMedia.setVolume request, @mediaCommandSuccessCallback.bind(this, "media set-volume done"), @onError
  @player_.trigger "volumechange"
  return

vjs.ChromeCastComponent::incrementMediaTime = ->
  if @apiMedia.playerState is chrome.cast.media.PlayerState.PLAYING
    if @currentMediaTime < @apiMedia.media.duration
      @currentMediaTime += 1
      @trigger "timeupdate"

    #this.updateProgressBarByTimer();
    else
      @currentMediaTime = 0
      clearInterval @timer
  return

vjs.ChromeCastComponent::updateProgressBarByTimer = ->

  #vjs.log(this.currentMediaTime);
  bufferedPercent = parseInt(100 * @currentMediaTime / @apiMedia.media.duration)

  #vjs.log(bufferedPercent + "%");
  @player_.controlBar.progressControl.seekBar.bar.el_.style.width = vjs.round(bufferedPercent, 2) + "%"  if @player_.controlBar.progressControl.seekBar.bar.el_.style
  @player_.controlBar.progressControl.seekBar.seekHandle.el_.style.left = vjs.round(bufferedPercent, 2) + "%"  if @player_.controlBar.progressControl.seekBar.seekHandle.el_.style
  @player_.controlBar.currentTimeDisplay.content.innerHTML = "<span class=\"vjs-control-text\">Current Time </span>" + vjs.formatTime(@currentMediaTime)
  return


###*
Callback function for media command success
###
vjs.ChromeCastComponent::mediaCommandSuccessCallback = (info, e) ->
  vjs.log info
  return

vjs.ChromeCastComponent::onError = ->
  vjs.log "error"
  return


###*
Stops the running receiver application associated with the session.
###
vjs.ChromeCastComponent::stopCasting = ->
  @apiSession.stop @onStopAppSuccess.bind(this), @onError.bind(this)
  return


###*
Callback function for stop app success
###
vjs.ChromeCastComponent::onStopAppSuccess = ->
  clearInterval @timer
  @casting = false
  @removeClass "connected"
  @player_.src @player_.options_["sources"]
  vjs.insertFirst @player_.tech.el_, @player_.el()
  if @apiMedia.playerState is "IDLE"
    @player_.currentTime 0
    @player_.onPause()
  else
    @player_.currentTime @currentMediaTime
    @player_.play()  unless @paused
  @apiMedia = null
  return

vjs.ChromeCastComponent::buildCSSClass = ->
  @className + vjs.Button::buildCSSClass.call(this)

vjs.ChromeCastComponent::createEl = (type, props) ->
  el = vjs.Button::createEl.call(this, "div")
  el

vjs.ChromeCastComponent::onClick = ->
  vjs.Button::onClick.call this
  if @casting
    @stopCasting()
  else
    @doLaunch()
  return
