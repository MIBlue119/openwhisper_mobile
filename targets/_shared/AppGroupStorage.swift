import Foundation

/// Provides shared storage access between the main app and keyboard extension
/// via the App Group container.
struct AppGroupStorage {
    static let shared = AppGroupStorage()

    private let defaults: UserDefaults?

    init() {
        defaults = UserDefaults(suiteName: OpenWhisprConstants.appGroupIdentifier)
    }

    // MARK: - Container URLs

    /// URL of the shared App Group container directory.
    var containerURL: URL? {
        FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: OpenWhisprConstants.appGroupIdentifier
        )
    }

    // MARK: - Dictation State

    /// Read the current dictation state from shared storage.
    func getDictationState() -> DictationState? {
        guard let data = defaults?.data(forKey: OpenWhisprConstants.Key.dictationState) else {
            return nil
        }
        return try? JSONDecoder().decode(DictationState.self, from: data)
    }

    /// Write a dictation state to shared storage and post a Darwin notification.
    func setDictationState(_ state: DictationState) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        defaults?.set(data, forKey: OpenWhisprConstants.Key.dictationState)
        defaults?.synchronize()
        postDarwinNotification(OpenWhisprConstants.Notification.dictationStateChanged)
    }

    /// Clear the dictation state (set to idle).
    func clearDictationState() {
        let idle = DictationState(phase: .idle)
        setDictationState(idle)
    }

    // MARK: - Background Session

    /// Whether the main app's background audio session is active.
    var isBackgroundSessionActive: Bool {
        get {
            guard defaults?.bool(forKey: OpenWhisprConstants.Key.backgroundSessionActive) == true else {
                return false
            }
            // Check heartbeat freshness (stale after 60s without ping)
            let lastPing = defaults?.double(forKey: OpenWhisprConstants.Key.backgroundSessionLastPing) ?? 0
            return Date().timeIntervalSince1970 - lastPing < 60
        }
        set {
            defaults?.set(newValue, forKey: OpenWhisprConstants.Key.backgroundSessionActive)
            if newValue {
                defaults?.set(
                    Date().timeIntervalSince1970,
                    forKey: OpenWhisprConstants.Key.backgroundSessionLastPing
                )
            }
            defaults?.synchronize()
        }
    }

    /// Update the background session heartbeat timestamp.
    func pingBackgroundSession() {
        defaults?.set(
            Date().timeIntervalSince1970,
            forKey: OpenWhisprConstants.Key.backgroundSessionLastPing
        )
        defaults?.synchronize()
    }

    // MARK: - Settings (read-only from extension)

    var selectedModel: String? {
        defaults?.string(forKey: OpenWhisprConstants.Key.selectedModel)
    }

    var selectedLanguage: String? {
        defaults?.string(forKey: OpenWhisprConstants.Key.selectedLanguage)
    }

    var transcriptionMode: String? {
        defaults?.string(forKey: OpenWhisprConstants.Key.transcriptionMode)
    }

    // MARK: - Darwin Notifications

    /// Post a Darwin notification that crosses process boundaries.
    func postDarwinNotification(_ name: String) {
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        CFNotificationCenterPostNotification(center, CFNotificationName(name as CFString), nil, nil, true)
    }

    /// Observe a Darwin notification. The callback fires on the main thread.
    func observeDarwinNotification(_ name: String, callback: @escaping () -> Void) {
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        let observer = UnsafeRawPointer(Unmanaged.passUnretained(self as AnyObject).toOpaque())

        // Store callback in a static dictionary keyed by notification name
        DarwinCallbackStore.callbacks[name] = callback

        CFNotificationCenterAddObserver(
            center,
            observer,
            { _, _, cfName, _, _ in
                guard let name = cfName?.rawValue as String? else { return }
                DispatchQueue.main.async {
                    DarwinCallbackStore.callbacks[name]?()
                }
            },
            name as CFString,
            nil,
            .deliverImmediately
        )
    }
}

/// Static store for Darwin notification callbacks (required because CFNotificationCenter
/// uses a C-style callback that cannot capture Swift closures).
private enum DarwinCallbackStore {
    static var callbacks: [String: () -> Void] = [:]
}
