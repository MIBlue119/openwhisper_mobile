import Foundation

/// Shared constants between the main app and keyboard extension.
enum OpenWhisprConstants {
    static let appGroupIdentifier = "group.com.openwhispr.mobile"
    static let keychainAccessGroup = "com.openwhispr.mobile.shared"
    static let urlScheme = "openwhispr"

    /// UserDefaults keys for App Group shared storage.
    enum Key {
        static let dictationState = "com.openwhispr.dictation_state"
        static let backgroundSessionActive = "com.openwhispr.bg_session_active"
        static let backgroundSessionLastPing = "com.openwhispr.bg_session_ping"
        static let selectedModel = "selectedModel"
        static let selectedLanguage = "selectedLanguage"
        static let transcriptionMode = "transcriptionMode"
        static let customDictionary = "customDictionary"
    }

    /// Darwin notification names for real-time IPC.
    enum Notification {
        static let dictationStateChanged = "com.openwhispr.dictation.stateChanged"
        static let settingsChanged = "com.openwhispr.settings.changed"
    }
}
