/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "keyboard",
  name: "OpenWhisprKeyboard",
  displayName: "OpenWhispr Voice",
  // Dot-prefix appends to main app bundle ID → com.openwhispr.mobile.keyboard
  bundleIdentifier: ".keyboard",
  deploymentTarget: "17.0",
  frameworks: ["UIKit"],
  entitlements: {
    "com.apple.security.application-groups": [
      "group.com.openwhispr.mobile",
    ],
    "keychain-access-groups": [
      "$(AppIdentifierPrefix)com.openwhispr.mobile.shared",
    ],
  },
};
