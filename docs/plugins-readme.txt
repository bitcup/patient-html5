installing/adding plugins
-------------------------
from top level dir (parent of www)
> rm -rf platforms/
> rm -rf plugins/
> mkdir platforms
> cordova plugin add org.apache.cordova.device
> cordova plugin add org.apache.cordova.statusbar
> cordova plugin add https://github.com/driftyco/ionic-plugins-keyboard.git
> cordova plugin add de.appplant.cordova.plugin.email-composer && cordova prepare
> cordova platform add ios
    (make sure that the plugin .h and .m files are copied to platforms/ios/SawacarePatient/Plugins (under plugin name directories)
> cordova build ios

running in emulator
-------------------
- follow steps above to install plugins and build ios
- open platforms/ios/SawacarePatient.xcodeproj in XCode and make sure Plugins folder has all .h and .m files
- click on play button to run in emulator