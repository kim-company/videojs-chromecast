/*! videojs-chromecast - v0.0.1 - 2014-09-18
* https://github.com/kim-company/videojs-chromecast
* Copyright (c) 2014 KIM Keep In Mind GmbH, srl; Licensed MIT */

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  vjs.plugin("chromecast", function(options) {
    this.player = this;
    this.chromecastComponent = new vjs.ChromecastComponent(this, options);
    return this.player.controlBar.addChild(this.chromecastComponent);
  });

  vjs.ChromecastComponent = (function(_super) {
    __extends(ChromecastComponent, _super);

    ChromecastComponent.prototype.kind_ = "chromecast";

    ChromecastComponent.prototype.buttonText = "Chromecast";

    ChromecastComponent.prototype.className = "vjs-chromecast-button ";

    ChromecastComponent.prototype.apiInitialized = false;

    ChromecastComponent.prototype.apiSession = null;

    ChromecastComponent.prototype.apiMedia = null;

    ChromecastComponent.prototype.casting = false;

    ChromecastComponent.prototype.paused = true;

    ChromecastComponent.prototype.muted = false;

    ChromecastComponent.prototype.currentVolume = 1;

    ChromecastComponent.prototype.currentMediaTime = 0;

    ChromecastComponent.prototype.timer = null;

    ChromecastComponent.prototype.timerStep = 1000;

    function ChromecastComponent(player, settings) {
      this.settings = settings;
      vjs.Button.call(this, player, settings);
      if (!player.controls()) {
        this.disable();
      }
      this.hide();
      this.el_.setAttribute("role", "button");
      this.initializeApi();
      return;
    }

    ChromecastComponent.prototype.initializeApi = function() {
      var apiConfig, sessionRequest;
      if (!vjs.IS_CHROME) {
        return;
      }
      if (!chrome.cast || !chrome.cast.isAvailable) {
        vjs.log("Cast APIs not available. Retrying...");
        setTimeout(this.initializeApi.bind(this), 1000);
        return;
      }
      vjs.log("Cast APIs are available");
      sessionRequest = this.settings.appId ? new chrome.cast.SessionRequest(this.settings.appId) : new chrome.cast.SessionRequest(chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID);
      apiConfig = new chrome.cast.ApiConfig(sessionRequest, this.sessionJoinedListener, this.receiverListener.bind(this));
      return chrome.cast.initialize(apiConfig, this.onInitSuccess.bind(this), this.castError);
    };

    ChromecastComponent.prototype.sessionJoinedListener = function(session) {
      return vjs.log("Joined " + session.sessionId);
    };

    ChromecastComponent.prototype.receiverListener = function(availability) {
      if (availability === "available") {
        return this.show();
      }
    };

    ChromecastComponent.prototype.onInitSuccess = function() {
      return this.apiInitialized = true;
    };

    ChromecastComponent.prototype.castError = function(castError) {
      return vjs.log("Cast Error: " + (JSON.stringify(castError)));
    };

    ChromecastComponent.prototype.doLaunch = function() {
      vjs.log("Cast video: " + (this.player_.currentSrc()));
      if (this.apiInitialized) {
        return chrome.cast.requestSession(this.onSessionSuccess.bind(this), this.castError);
      } else {
        return vjs.log("Session not initialized");
      }
    };

    ChromecastComponent.prototype.onSessionSuccess = function(session) {
      var loadRequest, mediaInfo;
      vjs.log("Session initialized: " + session.sessionId);
      this.apiSession = session;
      this.addClass("connected");
      mediaInfo = new chrome.cast.media.MediaInfo(this.player_.currentSrc(), "video/mp4");
      loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
      loadRequest.autoplay = true;
      loadRequest.currentTime = this.player_.currentTime();
      return this.apiSession.loadMedia(loadRequest, this.onMediaDiscovered.bind(this), this.castError);
    };

    ChromecastComponent.prototype.onMediaDiscovered = function(media) {
      this.apiMedia = media;
      this.apiMedia.addUpdateListener(this.onMediaStatusUpdate.bind(this));
      this.startProgressTimer(this.incrementMediaTime.bind(this));
      this.paused = false;
      this.player_.loadTech("ChromecastTech", {});
      this.player_.userActive(true);
      return this.casting = true;
    };

    ChromecastComponent.prototype.onMediaStatusUpdate = function(event) {
      if (!this.apiMedia) {
        return;
      }
      this.currentMediaTime = this.apiMedia.currentTime;
      if (this.apiMedia.playerState === "IDLE") {
        this.currentMediaTime = 0;
        this.trigger("timeupdate");
        return this.onStopAppSuccess();
      }
    };

    ChromecastComponent.prototype.startProgressTimer = function(callback) {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      return this.timer = setInterval(callback.bind(this), this.timerStep);
    };


    /*
    MEDIA PLAYER EVENTS
     */

    ChromecastComponent.prototype.play = function() {
      if (!this.apiMedia) {
        return;
      }
      if (this.paused) {
        this.apiMedia.play(null, this.mediaCommandSuccessCallback.bind(this, "Playing: " + this.apiMedia.sessionId), this.onError);
        this.apiMedia.addUpdateListener(this.onMediaStatusUpdate.bind(this));
        return this.paused = false;
      }
    };

    ChromecastComponent.prototype.pause = function() {
      if (!this.apiMedia) {
        return;
      }
      if (!this.paused) {
        this.apiMedia.pause(null, this.mediaCommandSuccessCallback.bind(this, "Paused: " + this.apiMedia.sessionId), this.onError);
        return this.paused = true;
      }
    };

    ChromecastComponent.prototype.seekMedia = function(position) {
      var request;
      request = new chrome.cast.media.SeekRequest();
      request.currentTime = position;
      return this.apiMedia.seek(request, this.onSeekSuccess.bind(this, position), this.onError);
    };

    ChromecastComponent.prototype.onSeekSuccess = function(position) {
      return this.currentMediaTime = position;
    };

    ChromecastComponent.prototype.setMediaVolume = function(level, mute) {
      var request, volume;
      if (!this.apiMedia) {
        return;
      }
      volume = new chrome.cast.Volume();
      volume.level = level;
      volume.muted = mute;
      this.currentVolume = volume.level;
      this.muted = mute;
      request = new chrome.cast.media.VolumeRequest();
      request.volume = volume;
      this.apiMedia.setVolume(request, this.mediaCommandSuccessCallback.bind(this, "Volume changed"), this.onError);
      return this.player_.trigger("volumechange");
    };

    ChromecastComponent.prototype.incrementMediaTime = function() {
      if (this.apiMedia.playerState !== chrome.cast.media.PlayerState.PLAYING) {
        return;
      }
      if (this.currentMediaTime < this.apiMedia.media.duration) {
        this.currentMediaTime += 1;
        return this.trigger("timeupdate");
      } else {
        this.currentMediaTime = 0;
        return clearInterval(this.timer);
      }
    };

    ChromecastComponent.prototype.mediaCommandSuccessCallback = function(information, event) {
      return vjs.log(information);
    };

    ChromecastComponent.prototype.onError = function() {
      return vjs.log("error");
    };

    ChromecastComponent.prototype.stopCasting = function() {
      return this.apiSession.stop(this.onStopAppSuccess.bind(this), this.onError);
    };

    ChromecastComponent.prototype.onStopAppSuccess = function() {
      clearInterval(this.timer);
      this.casting = false;
      this.removeClass("connected");
      this.player_.src(this.player_.options_["sources"]);
      vjs.insertFirst(this.player_.tech.el_, this.player_.el());
      if (this.apiMedia.playerState === "IDLE") {
        this.player_.currentTime(0);
        this.player_.onPause();
      } else {
        this.player_.currentTime(this.currentMediaTime);
        if (!this.paused) {
          this.player_.play();
        }
      }
      return this.apiMedia = null;
    };

    ChromecastComponent.prototype.buildCSSClass = function() {
      return this.className + vjs.Button.prototype.buildCSSClass.call(this);
    };

    ChromecastComponent.prototype.createEl = function(type, props) {
      return vjs.Button.prototype.createEl.call(this, "div");
    };

    ChromecastComponent.prototype.onClick = function() {
      vjs.Button.prototype.onClick.call(this);
      if (this.casting) {
        return this.stopCasting();
      } else {
        return this.doLaunch();
      }
    };

    return ChromecastComponent;

  })(vjs.Button);

  vjs.ChromecastTech = (function(_super) {
    __extends(ChromecastTech, _super);

    ChromecastTech.prototype.defaultMuted = false;

    ChromecastTech.prototype.loop = false;

    ChromecastTech.isSupported = function() {
      return this.player_.chromecastComponent.apiInitialized;
    };

    ChromecastTech.canPlaySource = function(source) {
      return source.type === "video/mp4";
    };

    function ChromecastTech(player, options, ready) {
      this.features["volumeControl"] = true;
      this.features["movingMediaElementInDOM"] = false;
      this.features["fullscreenResize"] = false;
      this.features["progressEvents"] = true;
      this.features["timeupdateEvents"] = true;
      vjs.MediaTechController.call(this, player, options, ready);
      this.el_ = videojs.Component.prototype.createEl("div", {
        id: "" + this.player_.id_ + "_chromecast_api",
        className: "vjs-tech vjs-tech-chromecast",
        innerHTML: "<div class=\"casting-image\" style=\"background-image: url('" + this.player_.options_.poster + "')\"></div><div class=\"casting-overlay\"><div class=\"casting-information\"><div class=\"casting-icon\">&#58880</div><div class=\"casting-description\"><small>CASTING TO</small><br>Chromecast</div></div>"
      });
      vjs.insertFirst(this.el_, this.player_.el());
      this.triggerReady();
    }

    ChromecastTech.prototype.dispose = function() {
      return vjs.MediaTechController.prototype.dispose.call(this);
    };


    /*
    MEDIA PLAYER EVENTS
     */

    ChromecastTech.prototype.play = function() {
      this.player_.chromecastComponent.play();
      return this.player_.onPlay();
    };

    ChromecastTech.prototype.pause = function() {
      this.player_.chromecastComponent.pause();
      return this.player_.onPause();
    };

    ChromecastTech.prototype.paused = function() {
      return this.player_.chromecastComponent.paused;
    };

    ChromecastTech.prototype.currentTime = function() {
      return this.player_.chromecastComponent.currentMediaTime;
    };

    ChromecastTech.prototype.setCurrentTime = function(seconds) {
      return this.player_.chromecastComponent.seekMedia(seconds);
    };

    ChromecastTech.prototype.duration = function() {
      return 0;
    };

    ChromecastTech.prototype.buffered = function() {
      return {
        length: 0
      };
    };

    ChromecastTech.prototype.volume = function() {
      return this.player_.chromecastComponent.currentVolume;
    };

    ChromecastTech.prototype.setVolume = function(volume) {
      return this.player_.chromecastComponent.setMediaVolume(volume, false);
    };

    ChromecastTech.prototype.muted = function() {
      return this.player_.chromecastComponent.muted;
    };

    ChromecastTech.prototype.setMuted = function(muted) {
      return this.player_.chromecastComponent.setMediaVolume(this.player_.chromecastComponent.currentVolume, muted);
    };

    ChromecastTech.prototype.supportsFullScreen = function() {
      return false;
    };

    ChromecastTech.prototype.enterFullScreen = function() {
      return vjs.log("enterFullScreen");
    };

    ChromecastTech.prototype.exitFullScreen = function() {
      return vjs.log("exitFullScreen");
    };

    ChromecastTech.prototype.src = function(src) {
      return vjs.log("ChromecastTech::src -> " + src);
    };

    ChromecastTech.prototype.load = function() {
      return vjs.log("ChromecastTech::load");
    };

    ChromecastTech.prototype.currentSrc = function() {
      return vjs.log("currentSrc");
    };

    ChromecastTech.prototype.poster = function() {
      return vjs.log("poster?");
    };

    ChromecastTech.prototype.setPoster = function(val) {
      return vjs.log("setPoster: " + val);
    };

    ChromecastTech.prototype.preload = function() {
      return true;
    };

    ChromecastTech.prototype.setPreload = function(val) {
      return vjs.log("setPreload: " + val);
    };

    ChromecastTech.prototype.autoplay = function() {
      return true;
    };

    ChromecastTech.prototype.setAutoplay = function(val) {
      return vjs.log("setAutoplay: " + val);
    };

    ChromecastTech.prototype.controls = function() {
      return true;
    };

    ChromecastTech.prototype.setControls = function(val) {
      return vjs.log("setControls: " + val);
    };

    ChromecastTech.prototype.setLoop = function(val) {
      return vjs.log("setLoop: " + val);
    };

    ChromecastTech.prototype.error = function() {
      return false;
    };

    ChromecastTech.prototype.seeking = function() {
      return false;
    };

    ChromecastTech.prototype.ended = function() {
      return false;
    };

    return ChromecastTech;

  })(vjs.MediaTechController);

}).call(this);
