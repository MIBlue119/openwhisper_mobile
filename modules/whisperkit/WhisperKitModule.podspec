require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'WhisperKitModule'
  s.version        = package['version']
  s.summary        = 'WhisperKit integration for OpenWhispr mobile'
  s.description    = 'Expo native module bridging WhisperKit on-device speech recognition'
  s.homepage       = 'https://github.com/openwhispr/openwhispr'
  s.license        = package['license'] || 'MIT'
  s.author         = 'OpenWhispr'
  s.source         = { git: '' }

  s.platform       = :ios, '17.0'
  s.swift_version  = '5.9'

  s.source_files   = 'ios/**/*.swift'

  s.dependency 'ExpoModulesCore'
end
