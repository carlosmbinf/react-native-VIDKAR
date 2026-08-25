Pod::Spec.new do |s|
  s.name           = 'VidkarIOSIntegration'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for VIDKAR Spotlight and App Intents integration'
  s.description    = 'Local Expo module that exposes Core Spotlight and publishes VIDKAR App Intents and App Shortcuts.'
  s.author         = 'VIDKAR'
  s.homepage       = 'https://vidkar.com'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '12.0' }
  s.swift_version  = '5.0'
  s.source         = { :git => 'https://vidkar.com/vidkar-ios-integration.git', :tag => s.version.to_s }
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AppIntents', 'CoreSpotlight'
end
