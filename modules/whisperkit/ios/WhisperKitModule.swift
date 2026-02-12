import ExpoModulesCore
import WhisperKit

public class WhisperKitModule: Module {
  private var whisperKit: WhisperKit?
  private var currentModelName: String?
  private var modelsDirectory: URL {
    let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
    let dir = appSupport.appendingPathComponent("whisperkit-models")
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    // Exclude from iCloud backup
    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    var mutableDir = dir
    try? mutableDir.setResourceValues(resourceValues)
    return dir
  }

  // MARK: - Available model definitions
  private struct ModelDef {
    let name: String
    let displayName: String
    let sizeBytes: Int64
  }

  private let availableModelDefs: [ModelDef] = [
    ModelDef(name: "openai_whisper-tiny",       displayName: "Tiny",       sizeBytes: 75_000_000),
    ModelDef(name: "openai_whisper-tiny.en",     displayName: "Tiny (EN)",  sizeBytes: 75_000_000),
    ModelDef(name: "openai_whisper-base",        displayName: "Base",       sizeBytes: 142_000_000),
    ModelDef(name: "openai_whisper-base.en",     displayName: "Base (EN)",  sizeBytes: 142_000_000),
    ModelDef(name: "openai_whisper-small",       displayName: "Small",      sizeBytes: 466_000_000),
    ModelDef(name: "openai_whisper-small.en",    displayName: "Small (EN)", sizeBytes: 466_000_000),
    ModelDef(name: "openai_whisper-medium",      displayName: "Medium",     sizeBytes: 1_500_000_000),
    ModelDef(name: "openai_whisper-medium.en",   displayName: "Medium (EN)", sizeBytes: 1_500_000_000),
    ModelDef(name: "openai_whisper-large-v3",    displayName: "Large v3",   sizeBytes: 3_000_000_000),
    ModelDef(name: "openai_whisper-large-v3-turbo", displayName: "Large v3 Turbo", sizeBytes: 1_600_000_000),
  ]

  public func definition() -> ModuleDefinition {
    Name("WhisperKitModule")

    Events("onDownloadProgress", "onDownloadComplete")

    // MARK: - Initialize WhisperKit with a model
    AsyncFunction("initialize") { (model: String) -> Bool in
      let modelFolder = self.modelsDirectory.appendingPathComponent(model).path

      // Check if model is downloaded
      guard FileManager.default.fileExists(atPath: modelFolder) else {
        throw WhisperKitError.modelNotDownloaded(model)
      }

      let config = WhisperKitConfig(
        model: model,
        modelFolder: modelFolder,
        verbose: false,
        logLevel: .none,
        prewarm: true,
        load: true,
        download: false
      )

      self.whisperKit = try await WhisperKit(config)
      self.currentModelName = model
      return true
    }

    // MARK: - Transcribe audio file
    AsyncFunction("transcribe") { (audioPath: String, language: String?, prompt: String?) -> [String: Any] in
      guard let pipe = self.whisperKit else {
        throw WhisperKitError.notInitialized
      }

      let startTime = CFAbsoluteTimeGetCurrent()

      let results = try await pipe.transcribe(audioPath: audioPath)

      guard let result = results.first else {
        throw WhisperKitError.transcriptionFailed("No transcription result returned")
      }

      let durationMs = Int((CFAbsoluteTimeGetCurrent() - startTime) * 1000)

      let segments: [[String: Any]] = result.segments.map { seg in
        [
          "text": seg.text,
          "start": seg.start,
          "end": seg.end,
        ]
      }

      return [
        "text": result.text,
        "language": result.language ?? "unknown",
        "segments": segments,
        "durationMs": durationMs,
      ]
    }

    // MARK: - Download model
    AsyncFunction("downloadModel") { (name: String) -> Bool in
      let destFolder = self.modelsDirectory.appendingPathComponent(name)

      // If already downloaded, return immediately
      if FileManager.default.fileExists(atPath: destFolder.path) {
        self.sendEvent("onDownloadComplete", [
          "modelName": name,
          "success": true,
        ])
        return true
      }

      do {
        // Use WhisperKit's built-in download
        let config = WhisperKitConfig(
          model: name,
          modelFolder: self.modelsDirectory.path,
          verbose: false,
          logLevel: .none,
          prewarm: false,
          load: false,
          download: true
        )

        // Send initial progress
        self.sendEvent("onDownloadProgress", [
          "modelName": name,
          "progress": 0.0,
          "downloadedBytes": 0,
          "totalBytes": 0,
        ])

        let _ = try await WhisperKit(config)

        // Exclude downloaded model from backup
        var resourceValues = URLResourceValues()
        resourceValues.isExcludedFromBackup = true
        var mutableDest = destFolder
        try? mutableDest.setResourceValues(resourceValues)

        self.sendEvent("onDownloadProgress", [
          "modelName": name,
          "progress": 1.0,
          "downloadedBytes": 0,
          "totalBytes": 0,
        ])

        self.sendEvent("onDownloadComplete", [
          "modelName": name,
          "success": true,
        ])
        return true
      } catch {
        self.sendEvent("onDownloadComplete", [
          "modelName": name,
          "success": false,
          "error": error.localizedDescription,
        ])
        throw WhisperKitError.downloadFailed(error.localizedDescription)
      }
    }

    // MARK: - Delete downloaded model
    AsyncFunction("deleteModel") { (name: String) -> Bool in
      let modelFolder = self.modelsDirectory.appendingPathComponent(name)
      guard FileManager.default.fileExists(atPath: modelFolder.path) else {
        return false
      }

      // If this is the currently loaded model, unload it
      if self.currentModelName == name {
        self.whisperKit = nil
        self.currentModelName = nil
      }

      try FileManager.default.removeItem(at: modelFolder)
      return true
    }

    // MARK: - Get available models with metadata
    AsyncFunction("getAvailableModels") { () -> [[String: Any]] in
      return self.availableModelDefs.map { def in
        let modelFolder = self.modelsDirectory.appendingPathComponent(def.name)
        let isDownloaded = FileManager.default.fileExists(atPath: modelFolder.path)
        return [
          "name": def.name,
          "displayName": def.displayName,
          "sizeBytes": def.sizeBytes,
          "isDownloaded": isDownloaded,
        ]
      }
    }

    // MARK: - Get downloaded model names
    AsyncFunction("getDownloadedModels") { () -> [String] in
      let contents = (try? FileManager.default.contentsOfDirectory(
        at: self.modelsDirectory,
        includingPropertiesForKeys: nil,
        options: .skipsHiddenFiles
      )) ?? []
      return contents
        .filter { $0.hasDirectoryPath }
        .map { $0.lastPathComponent }
    }

    // MARK: - Check if model is downloaded
    AsyncFunction("isModelDownloaded") { (name: String) -> Bool in
      let modelFolder = self.modelsDirectory.appendingPathComponent(name)
      return FileManager.default.fileExists(atPath: modelFolder.path)
    }

    // MARK: - Get recommended model for this device
    AsyncFunction("getRecommendedModel") { () -> String in
      // Use WhisperKit's built-in recommendation based on device chip
      let recommended = await WhisperKit.recommendedModels()
      return recommended.default
    }

    // MARK: - Get available disk space
    AsyncFunction("getAvailableDiskSpace") { () -> Int64 in
      let fileURL = URL(fileURLWithPath: NSHomeDirectory())
      let values = try fileURL.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
      return values.volumeAvailableCapacityForImportantUsage ?? 0
    }
  }
}

// MARK: - Error types
enum WhisperKitError: Error, LocalizedError {
  case notInitialized
  case modelNotDownloaded(String)
  case transcriptionFailed(String)
  case downloadFailed(String)

  var errorDescription: String? {
    switch self {
    case .notInitialized:
      return "WhisperKit is not initialized. Call initialize() first."
    case .modelNotDownloaded(let model):
      return "Model '\(model)' is not downloaded. Download it first."
    case .transcriptionFailed(let reason):
      return "Transcription failed: \(reason)"
    case .downloadFailed(let reason):
      return "Model download failed: \(reason)"
    }
  }
}
