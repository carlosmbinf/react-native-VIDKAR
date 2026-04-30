Pod::Spec.new do |s|
  s.name           = 'VidkarWatchBridge'
  s.version        = '1.0.0'
  s.summary        = 'Expo module bridge for VIDKAR Apple Watch communication'
  s.description    = 'Local Expo module that exposes WatchConnectivity to the VIDKAR React Native app.'
  s.author         = 'VIDKAR'
  s.homepage       = 'https://vidkar.com'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.0'
  s.source         = { :git => 'https://vidkar.com/vidkar-watch-bridge.git', :tag => s.version.to_s }
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WatchConnectivity'
end