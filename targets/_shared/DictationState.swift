import Foundation

/// Represents the current phase of a dictation session.
/// Used for IPC between the keyboard extension and the main app via App Group UserDefaults.
enum DictationPhase: String, Codable {
    case idle
    case startRequested = "start_requested"
    case recording
    case transcribing
    case complete
    case error
}

/// The shared dictation state written to App Group UserDefaults.
/// Each dictation uses a unique sessionId to prevent stale result insertion.
struct DictationState: Codable {
    let sessionId: String
    let phase: DictationPhase
    let text: String?
    let error: String?
    let timestamp: TimeInterval

    init(
        sessionId: String = UUID().uuidString,
        phase: DictationPhase = .idle,
        text: String? = nil,
        error: String? = nil,
        timestamp: TimeInterval = Date().timeIntervalSince1970
    ) {
        self.sessionId = sessionId
        self.phase = phase
        self.text = text
        self.error = error
        self.timestamp = timestamp
    }

    /// A state is considered stale after 60 seconds.
    var isStale: Bool {
        Date().timeIntervalSince1970 - timestamp > 60
    }
}
