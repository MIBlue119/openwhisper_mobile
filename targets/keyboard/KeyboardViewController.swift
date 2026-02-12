import UIKit

class KeyboardViewController: UIInputViewController {

    // MARK: - UI Elements

    private var dictateButton: UIButton!
    private var nextKeyboardButton: UIButton!
    private var statusLabel: UILabel!
    private var containerView: UIStackView!

    // MARK: - State

    private let appGroupStorage = AppGroupStorage.shared
    private var currentSessionId: String?
    private var pollingTimer: Timer?

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        startObserving()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopObserving()
    }

    // MARK: - UI Setup

    private func setupUI() {
        guard let inputView = inputView else { return }
        inputView.allowsSelfSizing = true

        let isDark = traitCollection.userInterfaceStyle == .dark
        let bgColor = isDark
            ? UIColor(red: 0.11, green: 0.11, blue: 0.12, alpha: 1.0)
            : UIColor(red: 0.82, green: 0.84, blue: 0.86, alpha: 1.0)
        inputView.backgroundColor = bgColor

        // Check Full Access
        guard hasFullAccess else {
            setupFullAccessGuide()
            return
        }

        // Next Keyboard button (required by Apple)
        nextKeyboardButton = UIButton(type: .system)
        nextKeyboardButton.setImage(
            UIImage(systemName: "globe"),
            for: .normal
        )
        nextKeyboardButton.tintColor = isDark ? .white : .darkGray
        nextKeyboardButton.addTarget(
            self,
            action: #selector(handleInputModeList(from:with:)),
            for: .allTouchEvents
        )
        nextKeyboardButton.translatesAutoresizingMaskIntoConstraints = false

        // Dictate button
        dictateButton = UIButton(type: .system)
        let micConfig = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)
        dictateButton.setImage(
            UIImage(systemName: "mic.fill", withConfiguration: micConfig),
            for: .normal
        )
        dictateButton.tintColor = .white
        dictateButton.backgroundColor = UIColor.systemBlue
        dictateButton.layer.cornerRadius = 28
        dictateButton.layer.cornerCurve = .continuous
        dictateButton.addTarget(self, action: #selector(dictateButtonTapped), for: .touchUpInside)
        dictateButton.translatesAutoresizingMaskIntoConstraints = false

        // Status label
        statusLabel = UILabel()
        statusLabel.text = "Tap to dictate"
        statusLabel.font = .systemFont(ofSize: 13, weight: .medium)
        statusLabel.textColor = isDark ? .lightGray : .darkGray
        statusLabel.textAlignment = .center
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        // Layout
        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false

        containerView = UIStackView(arrangedSubviews: [statusLabel, dictateButton, spacer])
        containerView.axis = .vertical
        containerView.alignment = .center
        containerView.spacing = 8
        containerView.translatesAutoresizingMaskIntoConstraints = false

        inputView.addSubview(containerView)
        inputView.addSubview(nextKeyboardButton)

        NSLayoutConstraint.activate([
            // Container centered
            containerView.topAnchor.constraint(equalTo: inputView.topAnchor, constant: 8),
            containerView.leadingAnchor.constraint(equalTo: inputView.leadingAnchor, constant: 16),
            containerView.trailingAnchor.constraint(equalTo: inputView.trailingAnchor, constant: -16),
            containerView.bottomAnchor.constraint(equalTo: inputView.bottomAnchor, constant: -8),

            // Dictate button size
            dictateButton.widthAnchor.constraint(equalToConstant: 56),
            dictateButton.heightAnchor.constraint(equalToConstant: 56),

            // Globe button bottom-left
            nextKeyboardButton.leadingAnchor.constraint(equalTo: inputView.leadingAnchor, constant: 8),
            nextKeyboardButton.bottomAnchor.constraint(equalTo: inputView.bottomAnchor, constant: -6),
            nextKeyboardButton.widthAnchor.constraint(equalToConstant: 36),
            nextKeyboardButton.heightAnchor.constraint(equalToConstant: 36),

            // Total keyboard height
            inputView.heightAnchor.constraint(equalToConstant: 120),
        ])
    }

    private func setupFullAccessGuide() {
        guard let inputView = inputView else { return }

        let isDark = traitCollection.userInterfaceStyle == .dark

        // Globe button still needed even without Full Access
        nextKeyboardButton = UIButton(type: .system)
        nextKeyboardButton.setImage(UIImage(systemName: "globe"), for: .normal)
        nextKeyboardButton.tintColor = isDark ? .white : .darkGray
        nextKeyboardButton.addTarget(
            self,
            action: #selector(handleInputModeList(from:with:)),
            for: .allTouchEvents
        )
        nextKeyboardButton.translatesAutoresizingMaskIntoConstraints = false

        let label = UILabel()
        label.text = "Enable Full Access to use voice dictation"
        label.font = .systemFont(ofSize: 14, weight: .medium)
        label.textColor = isDark ? .lightGray : .darkGray
        label.textAlignment = .center
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false

        let instructionLabel = UILabel()
        instructionLabel.text = "Settings > General > Keyboards > OpenWhispr Voice"
        instructionLabel.font = .systemFont(ofSize: 12, weight: .regular)
        instructionLabel.textColor = isDark ? .gray : .systemGray
        instructionLabel.textAlignment = .center
        instructionLabel.translatesAutoresizingMaskIntoConstraints = false

        inputView.addSubview(label)
        inputView.addSubview(instructionLabel)
        inputView.addSubview(nextKeyboardButton)

        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: inputView.centerXAnchor),
            label.topAnchor.constraint(equalTo: inputView.topAnchor, constant: 16),
            label.leadingAnchor.constraint(equalTo: inputView.leadingAnchor, constant: 20),
            label.trailingAnchor.constraint(equalTo: inputView.trailingAnchor, constant: -20),

            instructionLabel.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 4),
            instructionLabel.centerXAnchor.constraint(equalTo: inputView.centerXAnchor),

            nextKeyboardButton.leadingAnchor.constraint(equalTo: inputView.leadingAnchor, constant: 8),
            nextKeyboardButton.bottomAnchor.constraint(equalTo: inputView.bottomAnchor, constant: -6),
            nextKeyboardButton.widthAnchor.constraint(equalToConstant: 36),
            nextKeyboardButton.heightAnchor.constraint(equalToConstant: 36),

            inputView.heightAnchor.constraint(equalToConstant: 100),
        ])
    }

    // MARK: - Dictation

    @objc private func dictateButtonTapped() {
        let currentState = appGroupStorage.getDictationState()

        // If already recording, signal stop
        if currentState?.phase == .recording, currentState?.sessionId == currentSessionId {
            signalStop()
            return
        }

        // Start new dictation
        let sessionId = UUID().uuidString
        currentSessionId = sessionId

        let state = DictationState(
            sessionId: sessionId,
            phase: .startRequested
        )
        appGroupStorage.setDictationState(state)

        updateUI(for: .startRequested)

        // Check if background session is alive — if so, just signal via Darwin notification
        if appGroupStorage.isBackgroundSessionActive {
            // Main app is alive in background, no app switch needed
            return
        }

        // Deep link to main app to activate background audio session
        openMainApp(sessionId: sessionId)
    }

    private func signalStop() {
        guard let sessionId = currentSessionId else { return }
        let state = DictationState(
            sessionId: sessionId,
            phase: .startRequested,
            text: "stop"
        )
        appGroupStorage.setDictationState(state)
    }

    private func openMainApp(sessionId: String) {
        guard let url = URL(string: "\(OpenWhisprConstants.urlScheme)://dictate?session=\(sessionId)") else {
            return
        }

        // UIApplication.shared.open is not directly available in extensions.
        // Use the responder chain to find an object that can open URLs.
        var responder: UIResponder? = self
        while let r = responder {
            let selector = NSSelectorFromString("openURL:")
            if r.responds(to: selector) {
                r.perform(selector, with: url)
                break
            }
            responder = r.next
        }
    }

    // MARK: - State Observation

    private func startObserving() {
        // Poll App Group for state changes (0.5s interval)
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkDictationState()
        }

        // Also listen for Darwin notifications for real-time updates
        appGroupStorage.observeDarwinNotification(
            OpenWhisprConstants.Notification.dictationStateChanged
        ) { [weak self] in
            self?.checkDictationState()
        }
    }

    private func stopObserving() {
        pollingTimer?.invalidate()
        pollingTimer = nil
    }

    private func checkDictationState() {
        guard let sessionId = currentSessionId else { return }
        guard let state = appGroupStorage.getDictationState() else { return }

        // Only process states for our current session
        guard state.sessionId == sessionId else { return }

        // Ignore stale states
        guard !state.isStale else {
            resetToIdle()
            return
        }

        updateUI(for: state.phase)

        switch state.phase {
        case .complete:
            if let text = state.text, !text.isEmpty {
                insertTranscribedText(text)
            }
            resetToIdle()

        case .error:
            // Show error briefly, then reset
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                self?.resetToIdle()
            }

        default:
            break
        }
    }

    // MARK: - Text Insertion

    private func insertTranscribedText(_ text: String) {
        // Smart whitespace: prepend space if last character isn't space/newline
        let proxy = textDocumentProxy
        let before = proxy.documentContextBeforeInput ?? ""
        let needsSpace = !before.isEmpty
            && !before.hasSuffix(" ")
            && !before.hasSuffix("\n")
            && !before.hasSuffix("\t")

        let finalText = needsSpace ? " \(text)" : text
        proxy.insertText(finalText)
    }

    // MARK: - UI Updates

    private func updateUI(for phase: DictationPhase) {
        guard statusLabel != nil, dictateButton != nil else { return }

        switch phase {
        case .idle:
            statusLabel.text = "Tap to dictate"
            dictateButton.backgroundColor = .systemBlue
            let config = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)
            dictateButton.setImage(
                UIImage(systemName: "mic.fill", withConfiguration: config),
                for: .normal
            )

        case .startRequested:
            statusLabel.text = "Connecting..."
            dictateButton.backgroundColor = .systemOrange

        case .recording:
            statusLabel.text = "Listening... tap to stop"
            dictateButton.backgroundColor = .systemRed
            let config = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)
            dictateButton.setImage(
                UIImage(systemName: "stop.fill", withConfiguration: config),
                for: .normal
            )

        case .transcribing:
            statusLabel.text = "Transcribing..."
            dictateButton.backgroundColor = .systemGray

        case .complete:
            statusLabel.text = "Done"
            dictateButton.backgroundColor = .systemGreen
            let config = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)
            dictateButton.setImage(
                UIImage(systemName: "checkmark", withConfiguration: config),
                for: .normal
            )

        case .error:
            let errorState = appGroupStorage.getDictationState()
            statusLabel.text = errorState?.error ?? "Error occurred"
            dictateButton.backgroundColor = .systemRed
        }
    }

    private func resetToIdle() {
        currentSessionId = nil
        appGroupStorage.clearDictationState()
        updateUI(for: .idle)
    }

    // MARK: - Trait Changes

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            // Rebuild UI for new color scheme
            view.subviews.forEach { $0.removeFromSuperview() }
            setupUI()
        }
    }
}
