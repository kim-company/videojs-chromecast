module.exports = ->

  # Initialize the configuration
  @initConfig

    pkg: @file.readJSON "package.json"

    banner: """
      /*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today('yyyy-mm-dd') %>
      * <%= pkg.homepage %>
      * Copyright (c) <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>; Licensed <%= pkg.license %> */

      """

    clean:
      src: "dist/*"

    coffee:
      compileJoined:
        options:
          join: true
        files:
          "dist/videojs.chromecast.js": [
            "src/videojs.chromecast.coffee"
            "src/videojs.chromecastComponent.coffee"
            "src/videojs.chromecastTech.coffee"
          ]

    uglify:
      options:
        compress:
          drop_console: true
          pure_funcs: ["vjs.log"]
      dist:
        src: "dist/videojs.chromecast.js"
        dest: "dist/videojs.chromecast.min.js"

    less:
      development:
        files:
          "dist/videojs.chromecast.css": "src/videojs.chromecast.less"

    cssmin:
      dist:
        src: "dist/videojs.chromecast.css"
        dest: "dist/videojs.chromecast.min.css"

    usebanner:
      options:
        position: "top"
        banner: "<%= banner %>"
      files:
        src: [
          "dist/videojs.chromecast.js"
          "dist/videojs.chromecast.min.js"
          "dist/videojs.chromecast.min.css"
          "dist/videojs.chromecast.css"
        ]

    # Load external Grunt task plugins
    @loadNpmTasks "grunt-contrib-clean"
    @loadNpmTasks "grunt-contrib-uglify"
    @loadNpmTasks "grunt-contrib-cssmin"
    @loadNpmTasks "grunt-contrib-coffee"
    @loadNpmTasks "grunt-contrib-less"
    @loadNpmTasks "grunt-banner"

    # Default task
    @registerTask "default", ["clean", "coffee", "uglify", "less", "cssmin", "usebanner"]
