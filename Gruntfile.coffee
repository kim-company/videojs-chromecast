module.exports = ->

  # Initialize the configuration.
  @initConfig

    pkg: @file.readJSON "package.json"

    banner: """
      /*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today('yyyy-mm-dd') %>
      * <%= pkg.homepage %>
      * Copyright (c) <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>; Licensed <%= pkg.license %> */

      """

    clean:
      start:
        src: "dist/*"
      end:
        src: "cache"

    coffee:
      compileJoined:
        options:
          join: true
        files:
          "cache/videojs.chromecast.js": ["src/videojs.chromecast.coffee", "src/videojs.chromecastComponent.coffee"]

    concat:
      options:
        separator: ""
      dist:
        src: ["cache/videojs.chromecast.js", "cache/videojs.chromecastComponent.js", "src/videojs.chromecastTech.js"]
        dest: "dist/videojs.chromecast.js"

    uglify:
      options:
        compress:
          drop_console: true
          pure_funcs: ["vjs.log"]
      dist:
        src: "dist/videojs.chromecast.js"
        dest: "dist/videojs.chromecast.min.js"

    copy:
      dist:
        src: "src/videojs.chromecast.css"
        dest: "dist/videojs.chromecast.css"

    cssmin:
      dist:
        src: "src/videojs.chromecast.css"
        dest: "dist/videojs.chromecast.min.css"

    usebanner:
      taskName:
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

    # Load external Grunt task plugins.
    @loadNpmTasks "grunt-contrib-clean"
    @loadNpmTasks "grunt-contrib-uglify"
    @loadNpmTasks "grunt-contrib-concat"
    @loadNpmTasks "grunt-contrib-cssmin"
    @loadNpmTasks "grunt-contrib-copy"
    @loadNpmTasks "grunt-contrib-coffee"
    @loadNpmTasks "grunt-banner"

    # Default task.
    @registerTask "default", ["clean:start", "coffee", "concat", "uglify", "copy", "cssmin", "usebanner", "clean:end"]
