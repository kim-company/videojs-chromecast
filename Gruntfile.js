module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= pkg.license %> */\n',

    clean: {
      start: {
        src: ['dist/*']
      },
      end: {
        src: ['cache']
      }
    },

    coffee: {
      compileJoined: {
        options: {
          join: true
        },
        files: {
          'cache/videojs.chromecast.js': ['src/videojs.chromecast.coffee']
        }
      }
    },

    concat: {
      options: {
        separator: ''
      },
      dist: {
        src: ['src/videojs.pluginBase.js','cache/videojs.chromecast.js', 'src/videojs.chromecastComponent.js', 'src/videojs.chromecastTech.js'],
        dest: 'dist/videojs.chromecast.js'
      }
    },

    uglify: {
      options: {
        compress: {
          drop_console: true,
          pure_funcs: ["vjs.log"]
        }
      },
      dist: {
        src: 'dist/videojs.chromecast.js',
        dest: 'dist/videojs.chromecast.min.js'
      },
    },

    copy: {
      dist: {
        src: 'src/videojs.chromecast.css',
        dest: 'dist/videojs.chromecast.css'
      }
    },

    cssmin: {
      dist: {
        src: 'src/videojs.chromecast.css',
        dest: 'dist/videojs.chromecast.min.css'
      }
    },

    usebanner: {
      taskName: {
        options: {
          position: 'top',
          banner: '<%= banner %>'
        },
        files: {
          src: [
              'dist/videojs.chromecast.js',
              'dist/videojs.chromecast.min.js',
              'dist/videojs.chromecast.min.css',
              'dist/videojs.chromecast.css'
          ]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-banner');

  grunt.registerTask('default', ['clean:start', 'coffee', 'concat', 'uglify', 'copy', 'cssmin', 'usebanner', 'clean:end']);
};
