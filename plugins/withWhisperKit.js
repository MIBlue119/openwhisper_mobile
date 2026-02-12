const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin that adds WhisperKit SPM dependency to the Podfile
 * via the cocoapods-spm plugin.
 *
 * Prerequisites: `sudo gem install cocoapods-spm`
 */
function withWhisperKit(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContents = fs.readFileSync(podfilePath, "utf-8");

      // Add cocoapods-spm plugin at the top if not present
      if (!podfileContents.includes('plugin "cocoapods-spm"')) {
        podfileContents = `plugin "cocoapods-spm"\n\n${podfileContents}`;
      }

      // Add WhisperKit SPM package if not present
      if (!podfileContents.includes("spm_pkg \"WhisperKit\"")) {
        // Insert before the first `target` line
        const targetIndex = podfileContents.indexOf("target ");
        if (targetIndex !== -1) {
          const spmBlock = `
# WhisperKit on-device speech recognition
spm_pkg "WhisperKit",
  :url => "https://github.com/argmaxinc/WhisperKit.git",
  :version => "0.9.4",
  :products => ["WhisperKit"]

`;
          podfileContents =
            podfileContents.slice(0, targetIndex) +
            spmBlock +
            podfileContents.slice(targetIndex);
        }
      }

      fs.writeFileSync(podfilePath, podfileContents);
      return config;
    },
  ]);
}

module.exports = withWhisperKit;
