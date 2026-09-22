require 'json'
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'VidkarMCP'
  s.version        = package['version']
  s.summary        = package['description']
  s.homepage       = 'https://vidkar.com'
  s.license        = package['license']
  s.author         = 'VIDKAR'
  s.source         = { git: 'https://example.invalid/vidkar-mcp.git' }
  s.platforms      = { ios: '16.4' }
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.swift_version  = '5.9'
  s.dependency 'ExpoModulesCore'
end
