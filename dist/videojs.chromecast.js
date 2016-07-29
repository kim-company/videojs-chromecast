/*! videojs-chromecast - v1.1.1 - 2016-01-27
 * https://github.com/kim-company/videojs-chromecast
 * Copyright (c) 2016 KIM Keep In Mind GmbH, srl; Licensed MIT */
(function() {
    var ChromecastComponent, ChromecastTech, Tech, vjsButton,
        extend = function(child, parent) {
            for (var key in parent) {
                if (hasProp.call(parent, key)) child[key] = parent[key];
            }

            function ctor() {
                this.constructor = child;
            }
            ctor.prototype = parent.prototype;
            child.prototype = new ctor();
            child.__super__ = parent.prototype;
            return child;
        },
        hasProp = {}.hasOwnProperty;

    videojs.addLanguage("de", {
        "CASTING TO": "WIEDERGABE AUF"
    });

    videojs.addLanguage("it", {
        "CASTING TO": "PLAYBACK SU"
    });

    videojs.addLanguage('cy"', {
        "CASTING TO": "CASTIO I"
    });

    videojs.plugin("chromecast", function(options) {
        this.ready(function() {
            // chromecast button
            console.log('ready');
            var chromecastComponent = this.controlBar.addChild('ChromecastComponent', options);
            this.controlBar.el().insertBefore(chromecastComponent.el(), this.controlBar.fullscreenToggle.el());

        });
    });

    vjsButton = videojs.getComponent("Button");



    ChromecastComponent = (function(superClass) {
        extend(ChromecastComponent, superClass);

        ChromecastComponent.prototype.buttonText = "Chromecast";

        ChromecastComponent.prototype.inactivityTimeout = 2000;

        ChromecastComponent.prototype.apiInitialized = false;
        
        ChromecastComponent.prototype.currentMediaIndex = 0;

        ChromecastComponent.prototype.session = null;

        ChromecastComponent.prototype.apiMedia = null;

        ChromecastComponent.prototype.casting = false;

        ChromecastComponent.prototype.paused = true;

        ChromecastComponent.prototype.muted = false;

        ChromecastComponent.prototype.currentVolume = 1;

        ChromecastComponent.prototype.currentMediaTime = 0;

        ChromecastComponent.prototype.timer = null;

        ChromecastComponent.prototype.timerStep = 1000;
        
        ChromecastComponent.prototype.session = false;


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
            var apiConfig, appId, sessionRequest, autoJoinPolicy;
            if (!videojs.browser.IS_CHROME) {
                return;
            }
            if (!chrome.cast || !chrome.cast.isAvailable) {
                setTimeout(this.initializeApi.bind(this), 1000);
                return;
            }
            
            appId = this.settings.hasOwnProperty('appId') && this.settings.appId || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
            autoJoinPolicy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;
            sessionRequest = new chrome.cast.SessionRequest(appId);
            apiConfig = new chrome.cast.ApiConfig(sessionRequest, this.sessionListener.bind(this), this.receiverListener.bind(this), autoJoinPolicy);
            chrome.cast.initialize(apiConfig, this.onInitSuccess.bind(this), this.castError);
        };

               
        ChromecastComponent.prototype.onInitSuccess = function() {
	        console.log("init success");
            //this.apiInitialized = true;
        };
        
        ChromecastComponent.prototype.castError = function(castError) {
            videojs.log("Cast Error: " + (JSON.stringify(castError)));
        };

        ChromecastComponent.prototype.sessionListener = function(e) {
	        this.session = e;
	        console.log("session listener called");
	        if ( this.session ){
		        if (this.session.media[0]){
			        this.onMediaDiscovered(this.session.media[0]);
			         
		        }else{
			        console.log("session joined , no media playing");
					this.loadMedia();
		        }
		        this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
	        }
            
        };

        ChromecastComponent.prototype.receiverListener = function(availability) {
            if (availability === 'available') {
	            console.log('receiver found');
                this.show();
            }
        };

        ChromecastComponent.prototype.sessionUpdateListener = function(isAlive) {
            if (!isAlive) {
	            this.session = null;
	            clearInterval(this.timer);
                this.onStopAppSuccess();
            }
        };
        
        ChromecastComponent.prototype.doLaunch = function() {
	        console.log("launching app...");
	        chrome.cast.requestSession(
		        this.sessionListener.bind(this),
		        this.castError.bind(this));
		        if (this.timer ) {
			        clearInterval(this.timer);
		        }
        };
        
        ChromecastComponent.prototype.onRequestSessionSuccess = function(session) {
	        console.log("session success: " + session.sessionId);
	        this.session = session;
	        this.loadMedia();
	        this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
        }
        
        ChromecastComponent.prototype.loadMedia = function(){
	        console.log("load media called");
	        if(!this.session){
		        console.log("no session");
		        return;
	        }
	        this.addClass("connected");
	        if (this.player_.controlBar.audioSwitcher) {
                this.player_.controlBar.audioSwitcher.style.display = 'none';
            }
            
	        var mediaInfo = new chrome.cast.media.MediaInfo(this.player_.currentSrc(), this.player_.currentType());
	        
	        if (this.settings.metadata) {
                mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
                ref = this.settings.metadata;
                for (key in ref) {
                    value = ref[key];
                    mediaInfo.metadata[key] = value;
                }
            }
            if (this.player_.options_.poster) {
                image = new chrome.cast.Image(this.player_.options_.poster);
                mediaInfo.metadata.images = [image];
            }

            var plTracks = this.player().textTracks(),
                remotePlTracks = this.player().remoteTextTrackEls(),
                tracks = [],
                i = 0,
                remotePlTrack = undefined,
                plTrack = undefined,
                trackId = 0,
                track = undefined;
            if (plTracks) {
                for (i = 0; i < plTracks.length; i++) {
                    plTrack = plTracks.tracks_[i];
                    remotePlTrack = remotePlTracks && remotePlTracks.trackElements_ && remotePlTracks.trackElements_[i];
                    trackId++;
                    track = new chrome.cast.media.Track(trackId, chrome.cast.media.TrackType.TEXT);
                    track.trackContentId = remotePlTrack ? remotePlTrack.src : 'caption_' + plTrack.language;
                    track.subtype = chrome.cast.media.TextTrackType.SUBTITLES;
                    track.name = plTrack.label;
                    track.language = plTrack.language;
                    track.customData = null;
                    tracks.push(track);
                }
                mediaInfo.textTrackStyle = new chrome.cast.media.TextTrackStyle();
                mediaInfo.textTrackStyle.foregroundColor = '#FFFFFF';
                mediaInfo.textTrackStyle.backgroundColor = '#000000';
                mediaInfo.textTrackStyle.edgeType = chrome.cast.media.TextTrackEdgeType.DROP_SHADOW;
                mediaInfo.textTrackStyle.windowType = chrome.cast.media.TextTrackWindowType.ROUNDED_CORNERS;
            }
            if (tracks.length) {
                mediaInfo.tracks = tracks;
            }
            
            var loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
            loadRequest.autoplay = true;
            loadRequest.currentTime = this.player_.currentTime();
            //console.log(loadRequest.currentTime);

            this.session.loadMedia(loadRequest, this.onMediaDiscovered.bind(this), this.castError);
            var tracks = this.player().textTracks();

            if (tracks) {
                var _this = this;
                (function() {
                    var changeHandler = _this.handleTextTracksChange.bind(_this);

                    tracks.addEventListener('change', changeHandler);
                    _this.on('dispose', function() {
                        tracks.removeEventListener('change', changeHandler);
                    });


                    _this.handleTextTracksChange();
                })();
            }
            this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
        };

        ChromecastComponent.prototype.handleTextTracksChange = function() {
            var trackInfo = [];
            var tracks = this.player().textTracks();

            if (!tracks) {
                return;
            }

            for (var i = 0; i < tracks.length; i++) {
                var track = tracks[i];
                if (track['mode'] === 'showing') {
                    trackInfo.push(i + 1);
                } else if (track['mode'] === 'disabled') {

                }
            }

            if (this.apiMedia) {
                this.tracksInfoRequest = new chrome.cast.media.EditTracksInfoRequest(trackInfo);
                this.apiMedia.editTracksInfo(this.tracksInfoRequest, this.onTrackSuccess.bind(this), this.onTrackError.bind(this));
            }

        };

        ChromecastComponent.prototype.onTrackSuccess = function() {
            videojs.log('track added');
        }

        ChromecastComponent.prototype.onTrackError = function() {
            videojs.log('track Error');
        }

        ChromecastComponent.prototype.onMediaDiscovered = function(mediaSession) {
	        if (this.player_.controlBar.audioSwitcher) {
                this.player_.controlBar.audioSwitcher.style.display = 'none';
            }
            this.addClass("connected");
            this.apiMedia = mediaSession;
            this.apiMedia.addUpdateListener(this.onMediaStatusUpdate.bind(this));
            this.startProgressTimer(this.incrementMediaTime.bind(this));
            this.oldTech_ = this.player_.techName_;
            this.oldSrc_ = this.player_.currentSrc();
            this.player_.loadTech_("ChromecastTech", {
                currentSrc: this.player_.currentSrc(),
                receiver: this.session.receiver.friendlyName,
                chromecastComponent: this
            });
            this.casting = true;
            this.paused = this.player_.paused();
            this.inactivityTimeout = this.player_.options_.inactivityTimeout;
            this.player_.options_.inactivityTimeout = 0;
            this.player_.removeClass('not-hover');
            this.player_.on('mouseout', this.doNotHover.bind(this));
            this.player_.userActive(true);
        };

        ChromecastComponent.prototype.doNotHover = function() {
            return this.player_.removeClass('not-hover');
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
	        
            return this.session.stop(this.onStopAppSuccess.bind(this), this.handleTechError);
        };

        ChromecastComponent.prototype.onStopAppSuccess = function() {

            //stop chromecast , resume on play
            var time = this.player_.currentTime();
            this.casting = false;
            this.removeClass("connected");
            if (this.player_.controlBar.audioSwitcher) {
                this.player_.controlBar.audioSwitcher.style.display = 'inline';
            }
            
            this.player_.src(this.player_.options_['sources']);
            if (!this.player_.paused()) {
                this.player_.one('seeked', function() {
                    this.player_.play();
                });
            }
            
	        
                this.player_.currentTime(time);
                this.player_.play();
       
            this.player_.options_.inactivityTimeout = this.inactivityTimeout;
            this.session = null;
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
            element.innerHTML = "<div class=\"casting-image\" style=\"background-image: url('" + this.poster_ + "')\"></div>\n<div class=\"casting-overlay\">\n  <div class=\"casting-information\">\n    <div class=\"casting-icon\"></div>\n    <div class=\"casting-description\"><small>" + this.localize('CASTING TO') + "</small><br>" + this.receiver + "</div>\n  </div>\n</div>";
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
