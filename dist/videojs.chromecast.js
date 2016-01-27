/*! videojs-chromecast - v1.1.1 - 2016-01-27
* https://github.com/kim-company/videojs-chromecast
* Copyright (c) 2016 KIM Keep In Mind GmbH, srl; Licensed MIT */

(function() {
  var ChromecastComponent, ChromecastTech, Tech, vjsButton,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  videojs.addLanguage("de", {
    "CASTING TO": "WIEDERGABE AUF"
  });

  videojs.addLanguage("it", {
    "CASTING TO": "PLAYBACK SU"
  });

  videojs.plugin("chromecast", function(options) {
    return this.ready(function() {
      return this.chromecastComponent = this.controlBar.addChild('ChromecastComponent', options);
    });
  });

  vjsButton = videojs.getComponent("Button");

  ChromecastComponent = (function(superClass) {
    extend(ChromecastComponent, superClass);

    ChromecastComponent.prototype.buttonText = "Chromecast";

    ChromecastComponent.prototype.inactivityTimeout = 2000;

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
      ChromecastComponent.__super__.constructor.call(this, player, this.settings);
      if (!player.controls()) {
        this.disable();
      }
      this.hide();
      this.initializeApi();
    }

    ChromecastComponent.prototype.initializeApi = function() {
      var apiConfig, appId, sessionRequest;
      if (!videojs.browser.IS_CHROME) {
        return;
      }
      if (!chrome.cast || !chrome.cast.isAvailable) {
        videojs.log("Cast APIs not available. Waiting...");
        window['__onGCastApiAvailable'] = this.deferedInitialize.bind(this);
        return;
      }
      videojs.log("Cast APIs are available");
      appId = this.settings.hasOwnProperty('appId') && this.settings.appId || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
      sessionRequest = new chrome.cast.SessionRequest(appId);
      apiConfig = new chrome.cast.ApiConfig(sessionRequest, this.sessionJoinedListener, this.receiverListener.bind(this));
      return chrome.cast.initialize(apiConfig, this.onInitSuccess.bind(this), this.castError);
    };

    ChromecastComponent.prototype.deferedInitialize = function(loaded, errorInfo) {
      if (loaded) {
        return this.initializeApi();
      } else {
        videojs.log("Error initialising API");
        return videojs.log(errorInfo);
      }
    };

    ChromecastComponent.prototype.sessionJoinedListener = function(session) {
      return console.log("Session joined");
    };

    ChromecastComponent.prototype.receiverListener = function(availability) {
      if (availability === chrome.cast.ReceiverAvailability.AVAILABLE) {
        return this.show();
      }
    };

    ChromecastComponent.prototype.onInitSuccess = function() {
      return this.apiInitialized = true;
    };

    ChromecastComponent.prototype.castError = function(castError) {
      return videojs.log("Cast Error: " + (JSON.stringify(castError)));
    };

    ChromecastComponent.prototype.doLaunch = function() {
      videojs.log("Cast video: " + (this.player_.currentSrc()));
      if (this.apiInitialized) {
        return chrome.cast.requestSession(this.onSessionSuccess.bind(this), this.castError);
      } else {
        return videojs.log("Session not initialized");
      }
    };

    ChromecastComponent.prototype.onSessionSuccess = function(session) {
      var image, key, loadRequest, mediaInfo, ref, value;
      videojs.log("Session initialized: " + session.sessionId);
      this.apiSession = session;
      this.addClass("connected");
      mediaInfo = new chrome.cast.media.MediaInfo(this.player_.currentSrc(), this.player_.currentType());
      if (this.settings.metadata) {
        mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
        ref = this.settings.metadata;
        for (key in ref) {
          value = ref[key];
          mediaInfo.metadata[key] = value;
        }
        if (this.player_.options_.poster) {
          image = new chrome.cast.Image(this.player_.options_.poster);
          mediaInfo.metadata.images = [image];
        }
      }
      loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
      loadRequest.autoplay = true;
      loadRequest.currentTime = this.player_.currentTime();
      this.apiSession.loadMedia(loadRequest, this.onMediaDiscovered.bind(this), this.castError);
      return this.apiSession.addUpdateListener(this.onSessionUpdate.bind(this));
    };

    ChromecastComponent.prototype.onMediaDiscovered = function(media) {
      this.apiMedia = media;
      this.apiMedia.addUpdateListener(this.onMediaStatusUpdate.bind(this));
      this.startProgressTimer(this.incrementMediaTime.bind(this));
      this.oldTech_ = this.player_.techName_;
      this.oldSrc_ = this.player_.currentSrc();
      this.player_.loadTech_("ChromecastTech", {
        currentSrc: this.player_.currentSrc(),
        receiver: this.apiSession.receiver.friendlyName,
        chromecastComponent: this
      });
      this.casting = true;
      this.paused = this.player_.paused();
      this.inactivityTimeout = this.player_.options_.inactivityTimeout;
      this.player_.options_.inactivityTimeout = 0;
      this.player_.removeClass('not-hover');
      this.player_.on('mouseout', this.doNotHover.bind(this));
      return this.player_.userActive(true);
    };

    ChromecastComponent.prototype.doNotHover = function() {
      return this.player_.removeClass('not-hover');
    };

    ChromecastComponent.prototype.onSessionUpdate = function(isAlive) {
      if (!this.apiMedia) {
        return;
      }
      if (!isAlive) {
        return this.onStopAppSuccess();
      }
    };

    ChromecastComponent.prototype.onMediaStatusUpdate = function(isAlive) {
      if (!this.apiMedia) {
        return;
      }
      this.currentMediaTime = this.apiMedia.currentTime;
      switch (this.apiMedia.playerState) {
        case chrome.cast.media.PlayerState.IDLE:
          this.currentMediaTime = 0;
          this.trigger("timeupdate");
          return this.onStopAppSuccess();
        case chrome.cast.media.PlayerState.PAUSED:
          if (this.paused) {
            return;
          }
          this.player_.pause();
          return this.paused = true;
        case chrome.cast.media.PlayerState.PLAYING:
          if (!this.paused) {
            return;
          }
          this.player_.play();
          return this.paused = false;
      }
    };

    ChromecastComponent.prototype.startProgressTimer = function(callback) {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      return this.timer = setInterval(callback.bind(this), this.timerStep);
    };

    ChromecastComponent.prototype.play = function() {
      if (!this.apiMedia) {
        return;
      }
      if (this.paused) {
        this.apiMedia.play(null, this.mediaCommandSuccessCallback.bind(this, "Playing: " + this.apiMedia.sessionId), this.handleTechError);
        return this.paused = false;
      }
    };

    ChromecastComponent.prototype.pause = function() {
      if (!this.apiMedia) {
        return;
      }
      if (!this.paused) {
        this.apiMedia.pause(null, this.mediaCommandSuccessCallback.bind(this, "Paused: " + this.apiMedia.sessionId), this.handleTechError);
        return this.paused = true;
      }
    };

    ChromecastComponent.prototype.seekMedia = function(position) {
      var request;
      request = new chrome.cast.media.SeekRequest();
      request.currentTime = position;
      if (this.player_.controlBar.progressControl.seekBar.videoWasPlaying) {
        request.resumeState = chrome.cast.media.ResumeState.PLAYBACK_START;
      }
      return this.apiMedia.seek(request, this.onSeekSuccess.bind(this, position), this.handleTechError);
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
      this.apiMedia.setVolume(request, this.mediaCommandSuccessCallback.bind(this, "Volume changed"), this.handleTechError);
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
      return videojs.log(information);
    };

    ChromecastComponent.prototype.handleTechError = function() {
      return videojs.log("error");
    };

    ChromecastComponent.prototype.stopCasting = function() {
      return this.apiSession.stop(this.onStopAppSuccess.bind(this), this.handleTechError);
    };

    ChromecastComponent.prototype.onStopAppSuccess = function() {
      clearInterval(this.timer);
      this.casting = false;
      this.removeClass("connected");
      this.player_.loadTech_(this.oldTech_);
      if (this.player_.catalog && this.player_.catalog.load && this.player_.mediainfo && this.player_.mediainfo.id) {
        this.player_.catalog.load(this.player_.mediainfo);
      } else {
        this.player_.src(this.oldSrc_);
      }
      if (!this.paused) {
        this.player_.one('seeked', function() {
          return this.player_.play();
        });
      }
      this.player_.currentTime(this.currentMediaTime);
      this.player_.options_.inactivityTimeout = this.inactivityTimeout;
      this.apiMedia = null;
      return this.apiSession = null;
    };

    ChromecastComponent.prototype.buildCSSClass = function() {
      return ChromecastComponent.__super__.buildCSSClass.apply(this, arguments) + "vjs-chromecast-button";
    };

    ChromecastComponent.prototype.handleClick = function() {
      ChromecastComponent.__super__.handleClick.apply(this, arguments);
      if (this.casting) {
        return this.stopCasting();
      } else {
        return this.doLaunch();
      }
    };

    return ChromecastComponent;

  })(vjsButton);

  videojs.registerComponent("ChromecastComponent", ChromecastComponent);

  Tech = videojs.getTech('Tech');

  ChromecastTech = (function(superClass) {
    extend(ChromecastTech, superClass);

    ChromecastTech.isSupported = function() {
      return this.chromecastComponent_.apiInitialized;
    };

    ChromecastTech.canPlaySource = function(source) {
      return source.type === "video/mp4" || source.type === "video/webm" || source.type === "application/x-mpegURL" || source.type === "application/vnd.apple.mpegURL";
    };

    function ChromecastTech(options) {
      this.featuresVolumeControl = true;
      this.movingMediaElementInDOM = false;
      this.featuresFullscreenResize = false;
      this.featuresProgressEvents = true;
      this.receiver = options.source.receiver;
      this.player_id_ = options.playerId;
      this.chromecastComponent_ = options.source.chromecastComponent;
      this.poster_ = options.poster;
      this.currentSrc_ = options.source.currentSrc;
      ChromecastTech.__super__.constructor.call(this, options);
      this.triggerReady();
    }

    ChromecastTech.prototype.createEl = function() {
      var element;
      element = document.createElement("div");
      element.id = this.player_id_ + "_chromecast_api";
      element.className = "vjs-tech vjs-tech-chromecast";
      element.innerHTML = "<div class=\"casting-image\" style=\"background-image: url('" + this.poster_ + "')\"></div>\n<div class=\"casting-overlay\">\n  <div class=\"casting-information\">\n    <div class=\"casting-icon\"></div>\n    <div class=\"casting-description\"><small>" + (this.localize("CASTING TO")) + "</small><br>" + this.receiver + "</div>\n  </div>\n</div>";
      return element;
    };


    /*
    MEDIA PLAYER EVENTS
     */

    ChromecastTech.prototype.play = function() {
      this.chromecastComponent_.play();
      return this.trigger('play');
    };

    ChromecastTech.prototype.pause = function() {
      this.chromecastComponent_.pause();
      return this.trigger('pause');
    };

    ChromecastTech.prototype.paused = function() {
      return this.chromecastComponent_.paused;
    };

    ChromecastTech.prototype.currentTime = function() {
      return this.chromecastComponent_.currentMediaTime;
    };

    ChromecastTech.prototype.setCurrentTime = function(seconds) {
      return this.chromecastComponent_.seekMedia(seconds);
    };

    ChromecastTech.prototype.currentSrc = function(src) {
      if (typeof src !== 'undefined') {
        videojs.log("TODO Should change source to: " + src);
      }
      return this.currentSrc_;
    };

    ChromecastTech.prototype.src = function(src) {
      return this.currentSrc(src);
    };

    ChromecastTech.prototype.duration = function() {
      return videojs.log("ChromecastTech got duration call??");
    };

    ChromecastTech.prototype.ended = function() {
      return true;
    };

    ChromecastTech.prototype.controls = function() {
      return false;
    };

    ChromecastTech.prototype.volume = function() {
      return this.chromecastComponent_.currentVolume;
    };

    ChromecastTech.prototype.setVolume = function(volume) {
      return this.chromecastComponent_.setMediaVolume(volume, false);
    };

    ChromecastTech.prototype.muted = function() {
      return this.chromecastComponent_.muted;
    };

    ChromecastTech.prototype.setMuted = function(muted) {
      return this.chromecastComponent_.setMediaVolume(this.chromecastComponent_.currentVolume, muted);
    };

    ChromecastTech.prototype.supportsFullScreen = function() {
      return false;
    };

    return ChromecastTech;

  })(Tech);

  videojs.registerTech("ChromecastTech", ChromecastTech);

}).call(this);
